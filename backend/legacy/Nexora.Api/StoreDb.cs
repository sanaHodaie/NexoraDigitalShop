using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Nexora.Api;

public sealed class StoreDb(DbContextOptions<StoreDb> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<Subscriber> Subscribers => Set<Subscriber>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasIndex(x => x.Email).IsUnique();
        b.Entity<UserProfile>().HasKey(x => x.UserId);
        b.Entity<UserProfile>().HasIndex(x => x.GoogleSubject).IsUnique();
        b.Entity<UserProfile>().HasOne(x => x.User).WithOne().HasForeignKey<UserProfile>(x => x.UserId);
        b.Entity<Product>().Property(x => x.Price).HasPrecision(18, 2);
        b.Entity<CartItem>().HasKey(x => new { x.UserId, x.ProductId });
        b.Entity<WishlistItem>().HasKey(x => new { x.UserId, x.ProductId });
        b.Entity<OrderLine>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        b.Entity<Order>().Property(x => x.Total).HasPrecision(18, 2);
        b.Entity<Subscriber>().HasIndex(x => x.Email).IsUnique();
    }
}

public sealed class User { public int Id { get; set; } public string Email { get; set; } = ""; public string PasswordHash { get; set; } = ""; }
public sealed class UserProfile
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string FullName { get; set; } = "";
    public string? GoogleSubject { get; set; }
}
public sealed class Product { public string Id { get; set; } = ""; public string Name { get; set; } = ""; public string NameEn { get; set; } = ""; public string Category { get; set; } = ""; public decimal Price { get; set; } public int Stock { get; set; } = 100; public string Payload { get; set; } = ""; }
public sealed class CartItem { public int UserId { get; set; } public string ProductId { get; set; } = ""; public int Quantity { get; set; } }
public sealed class WishlistItem { public int UserId { get; set; } public string ProductId { get; set; } = ""; }
public sealed class Order { public int Id { get; set; } public int UserId { get; set; } public decimal Total { get; set; } public string Status { get; set; } = "pending_payment"; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; public List<OrderLine> Lines { get; set; } = []; }
public sealed class OrderLine { public int Id { get; set; } public int OrderId { get; set; } public string ProductId { get; set; } = ""; public int Quantity { get; set; } public decimal UnitPrice { get; set; } }
public sealed class Subscriber { public int Id { get; set; } public string Email { get; set; } = ""; }
