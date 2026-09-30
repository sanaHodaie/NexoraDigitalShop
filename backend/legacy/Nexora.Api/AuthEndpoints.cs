using System.Security.Claims;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

namespace Nexora.Api;

public static class AuthEndpoints
{
    public static void MapGoogleAuthentication(this WebApplication app)
    {
        var clientId = app.Configuration["Authentication:Google:ClientId"];
        app.MapGet("/api/auth/providers", () => Results.Ok(new { googleClientId = clientId }));
        app.MapPost("/api/auth/google", async (GoogleCredential input, StoreDb db, HttpContext ctx) =>
        {
            if (string.IsNullOrWhiteSpace(clientId))
                return Results.Json(new { error = "ورود با گوگل هنوز فعال نشده است. از ایمیل و رمز عبور استفاده کنید." }, statusCode: 503);
            if (string.IsNullOrWhiteSpace(input.Credential) || input.Credential.Length > 16384)
                return Results.BadRequest(new { error = "اطلاعات ورود گوگل معتبر نیست." });

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(input.Credential,
                    new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
            }
            catch (InvalidJwtException)
            {
                return Results.Json(new { error = "تأیید حساب گوگل ناموفق بود. دوباره تلاش کنید." }, statusCode: 401);
            }
            catch (HttpRequestException)
            {
                return Results.Json(new { error = "ارتباط با گوگل برقرار نشد. دوباره تلاش کنید." }, statusCode: 503);
            }
            if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Subject) || string.IsNullOrWhiteSpace(payload.Email) || payload.Email.Length > 254)
                return Results.Json(new { error = "یک حساب گوگل با ایمیل تأییدشده انتخاب کنید." }, statusCode: 401);

            // Identify Google accounts by their immutable subject, never by email alone.
            var profile = await db.UserProfiles.Include(x => x.User).SingleOrDefaultAsync(x => x.GoogleSubject == payload.Subject);
            if (profile is null)
            {
                var email = payload.Email.Trim().ToLowerInvariant();
                if (await db.Users.AnyAsync(x => x.Email == email))
                    return Results.Conflict(new { error = "این ایمیل قبلاً ثبت شده است. با رمز عبور حساب خود وارد شوید." });
                profile = new UserProfile
                {
                    User = new User { Email = email },
                    GoogleSubject = payload.Subject,
                    FullName = (payload.Name ?? "")[..Math.Min(payload.Name?.Length ?? 0, 100)]
                };
                db.UserProfiles.Add(profile);
                try { await db.SaveChangesAsync(); }
                catch (DbUpdateException) { return Results.Conflict(new { error = "حساب قبلاً ایجاد شده است. دوباره وارد شوید." }); }
            }
            await SignInAsync(ctx, profile.User);
            return Results.Ok(new { profile.User.Email, profile.FullName });
        }).RequireRateLimiting("auth");
    }

    public static async Task SignInAsync(HttpContext ctx, User user)
    {
        var db = ctx.RequestServices.GetRequiredService<StoreDb>();
        var name = await db.UserProfiles.Where(x => x.UserId == user.Id).Select(x => x.FullName).SingleOrDefaultAsync();
        await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, name ?? "")
            ], CookieAuthenticationDefaults.AuthenticationScheme)));
    }

    // EnsureCreated does not add tables to existing databases. This additive upgrade
    // preserves existing users and orders; replace with EF migrations in production.
    public static Task EnsureProfileSchemaAsync(StoreDb db) => db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "UserProfiles" (
            "UserId" INTEGER NOT NULL CONSTRAINT "PK_UserProfiles" PRIMARY KEY,
            "FullName" TEXT NOT NULL,
            "GoogleSubject" TEXT NULL,
            CONSTRAINT "FK_UserProfiles_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_UserProfiles_GoogleSubject" ON "UserProfiles" ("GoogleSubject");
        """);
}

public sealed record GoogleCredential(string Credential);
