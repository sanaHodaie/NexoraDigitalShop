using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Nexora.Api;


var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<StoreDb>(o => o.UseSqlite(builder.Configuration.GetConnectionString("Store") ?? "Data Source=nexora.db"));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "__Host-Nexora";
    o.Cookie.HttpOnly = true;
    o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.AddAuthorization();
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.Name = "__Host-Nexora-CSRF"; o.Cookie.SecurePolicy = CookieSecurePolicy.Always; o.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddFixedWindowLimiter("auth", x => { x.PermitLimit = 10; x.Window = TimeSpan.FromMinutes(1); x.QueueLimit = 0; });
    o.AddFixedWindowLimiter("newsletter", x => { x.PermitLimit = 5; x.Window = TimeSpan.FromMinutes(1); x.QueueLimit = 0; });
});
var app = builder.Build();
app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method))
    {
        var antiforgery = ctx.RequestServices.GetRequiredService<IAntiforgery>();
        if (!await antiforgery.IsRequestValidAsync(ctx)) { ctx.Response.StatusCode = 400; await ctx.Response.WriteAsJsonAsync(new { error = "Invalid CSRF token" }); return; }
    }
    await next();
});

app.MapGet("/api/csrf", (HttpContext ctx, IAntiforgery antiforgery) =>
{
    ctx.Response.Headers.CacheControl = "no-store";
    return Results.Ok(new { token = antiforgery.GetAndStoreTokens(ctx).RequestToken });
});
app.MapGet("/api/products", async (StoreDb db, string? q, string? category, int? limit) =>
{
    var query = db.Products.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(q))
    {
        var term = q.Trim();
        if (term.Length > 100) return Results.BadRequest(new { error = "Search too long" });
        query = query.Where(p => p.Name.Contains(term) || p.NameEn.Contains(term));
    }
    if (!string.IsNullOrWhiteSpace(category)) query = query.Where(p => p.Category == category);
    var products = await query.OrderBy(p => p.Id).Take(Math.Clamp(limit ?? 100, 1, 100)).ToListAsync();
    return Results.Ok(products.Select(PublicProduct));
});
app.MapGet("/api/products/{id}", async (string id, StoreDb db) =>
{
    var product = await db.Products.FindAsync(id);
    return product is null ? Results.NotFound() : Results.Ok(PublicProduct(product));
});

app.MapPost("/api/auth/register", async (Credentials input, StoreDb db, IPasswordHasher<User> hasher, HttpContext ctx) =>
{
    var email = input.Email.Trim().ToLowerInvariant();
    if (!ValidEmail(email) || input.Password.Length < 12 || input.Password.Length > 128) return Results.BadRequest(new { error = "Valid email and password of 12–128 characters required" });
    if (await db.Users.AnyAsync(x => x.Email == email)) return Results.Conflict(new { error = "Account already exists" });
    var user = new User { Email = email };
    user.PasswordHash = hasher.HashPassword(user, input.Password);
    db.Users.Add(user);
    try { await db.SaveChangesAsync(); } catch (DbUpdateException) { return Results.Conflict(new { error = "Account already exists" }); }
    await SignIn(ctx, user);
    return Results.Ok(new { user.Email });
}).RequireRateLimiting("auth");
app.MapPost("/api/auth/login", async (Credentials input, StoreDb db, IPasswordHasher<User> hasher, HttpContext ctx) =>
{
    var user = await db.Users.SingleOrDefaultAsync(x => x.Email == input.Email.Trim().ToLowerInvariant());
    if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password) == PasswordVerificationResult.Failed)
        return Results.Unauthorized();
    await SignIn(ctx, user);
    return Results.Ok(new { user.Email });
}).RequireRateLimiting("auth");
app.MapPost("/api/auth/logout", async (HttpContext ctx) => { await ctx.SignOutAsync(); return Results.NoContent(); }).RequireAuthorization();
app.MapGet("/api/auth/me", (HttpContext ctx) => Results.Ok(new { email = ctx.User.FindFirstValue(ClaimTypes.Email) })).RequireAuthorization();

var account = app.MapGroup("/api/account").RequireAuthorization();
account.MapGet("/cart", async (HttpContext ctx, StoreDb db) =>
{
    var userId = UserId(ctx);
    var items = await db.CartItems.Where(x => x.UserId == userId).ToListAsync();
    var ids = items.Select(x => x.ProductId).ToArray();
    var products = await db.Products.Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
    return Results.Ok(items.Where(x => products.ContainsKey(x.ProductId)).Select(x => new { product = PublicProduct(products[x.ProductId]), x.Quantity }));
});
account.MapPut("/cart/{id}", async (string id, QuantityInput input, HttpContext ctx, StoreDb db) =>
{
    if (input.Quantity is < 0 or > 99) return Results.BadRequest(new { error = "Quantity must be between 0 and 99" });
    var item = await db.CartItems.FindAsync(UserId(ctx), id);
    if (input.Quantity == 0) { if (item is not null) db.CartItems.Remove(item); }
    else
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return Results.NotFound();
        if (product.Stock < input.Quantity) return Results.Conflict(new { error = "Insufficient stock" });
        if (item is null) db.CartItems.Add(new CartItem { UserId = UserId(ctx), ProductId = id, Quantity = input.Quantity });
        else item.Quantity = input.Quantity;
    }
    await db.SaveChangesAsync();
    return Results.NoContent();
});
account.MapDelete("/cart", async (HttpContext ctx, StoreDb db) =>
{
    var userId = UserId(ctx);
    await db.CartItems.Where(x => x.UserId == userId).ExecuteDeleteAsync();
    return Results.NoContent();
});
account.MapGet("/wishlist", async (HttpContext ctx, StoreDb db) =>
{
    var userId = UserId(ctx);
    var ids = await db.WishlistItems.Where(x => x.UserId == userId).Select(x => x.ProductId).ToArrayAsync();
    return Results.Ok((await db.Products.Where(x => ids.Contains(x.Id)).ToListAsync()).Select(PublicProduct));
});
account.MapPut("/wishlist/{id}", async (string id, HttpContext ctx, StoreDb db) =>
{
    if (!await db.Products.AnyAsync(x => x.Id == id)) return Results.NotFound();
    if (await db.WishlistItems.FindAsync(UserId(ctx), id) is null)
    { db.WishlistItems.Add(new WishlistItem { UserId = UserId(ctx), ProductId = id }); await db.SaveChangesAsync(); }
    return Results.NoContent();
});
account.MapDelete("/wishlist/{id}", async (string id, HttpContext ctx, StoreDb db) =>
{
    var userId = UserId(ctx);
    await db.WishlistItems.Where(x => x.UserId == userId && x.ProductId == id).ExecuteDeleteAsync();
    return Results.NoContent();
});
account.MapPost("/orders", async (HttpContext ctx, StoreDb db) =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    var userId = UserId(ctx);
    var items = await db.CartItems.Where(x => x.UserId == userId).ToListAsync();
    if (items.Count == 0) return Results.BadRequest(new { error = "Cart is empty" });
    var ids = items.Select(x => x.ProductId).ToArray();
    var products = await db.Products.Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id);
    if (items.Any(x => !products.TryGetValue(x.ProductId, out var p) || p.Stock < x.Quantity))
        return Results.Conflict(new { error = "Product unavailable or insufficient stock" });
    var subtotal = items.Sum(x => products[x.ProductId].Price * x.Quantity);
    var total = subtotal + (subtotal >= 99 ? 0 : 9.99m);
    var order = new Order { UserId = UserId(ctx), Total = total,
        Lines = items.Select(x => new OrderLine { ProductId = x.ProductId, Quantity = x.Quantity, UnitPrice = products[x.ProductId].Price }).ToList() };
    // Inventory is reserved when an order is created. Payment integration must later release expired reservations.
    foreach (var item in items) products[item.ProductId].Stock -= item.Quantity;
    db.Orders.Add(order);
    db.CartItems.RemoveRange(items);
    await db.SaveChangesAsync();
    await transaction.CommitAsync();
    return Results.Ok(new { order.Id, order.Total, order.Status });
});
account.MapGet("/orders", async (HttpContext ctx, StoreDb db) =>
{
    var userId = UserId(ctx);
    return Results.Ok(await db.Orders.AsNoTracking().Where(x => x.UserId == userId).OrderByDescending(x => x.Id).Select(x => new { x.Id, x.Total, x.Status, x.CreatedAt }).ToListAsync());
});

app.MapPost("/api/newsletter", async (EmailInput input, StoreDb db) =>
{
    var email = input.Email.Trim().ToLowerInvariant();
    if (!ValidEmail(email)) return Results.BadRequest(new { error = "Invalid email" });
    if (!await db.Subscribers.AnyAsync(x => x.Email == email))
    { db.Subscribers.Add(new Subscriber { Email = email }); try { await db.SaveChangesAsync(); } catch (DbUpdateException) { } }
    return Results.Accepted();
}).RequireRateLimiting("newsletter");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StoreDb>();
    await db.Database.EnsureCreatedAsync(); // For production, replace with versioned EF migrations.
    if (!await db.Products.AnyAsync())
    {
        var json = await File.ReadAllTextAsync(Path.Combine(app.Environment.ContentRootPath, "Data/products.json"));
        foreach (var node in JsonNode.Parse(json)!.AsArray())
        {
            var p = node!;
            db.Products.Add(new Product { Id = p["id"]!.GetValue<string>(), Name = p["name"]!.GetValue<string>(),
                NameEn = p["nameEn"]!.GetValue<string>(), Category = p["category"]!.GetValue<string>(),
                Price = p["price"]!.GetValue<decimal>(), Payload = p.ToJsonString() });
        }
        await db.SaveChangesAsync();
    }
}
app.Run();

static object PublicProduct(Product p)
{
    var node = JsonNode.Parse(p.Payload)!.AsObject();
    node["price"] = p.Price;
    node["inStock"] = p.Stock > 0;
    return node;
}
static int UserId(HttpContext ctx) => int.Parse(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
static bool ValidEmail(string email) => email.Length <= 254 && Regex.IsMatch(email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.CultureInvariant);
static Task SignIn(HttpContext ctx, User user) => ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
    new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Email, user.Email)], CookieAuthenticationDefaults.AuthenticationScheme)));
public sealed record Credentials(string Email, string Password);
public sealed record QuantityInput(int Quantity);
public sealed record EmailInput(string Email);
