using Microsoft.EntityFrameworkCore;
using VRHaji.Web.Components;
using VRHaji.Web.Data;
using VRHaji.Web.Interfaces;
using VRHaji.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=VRHaji.db";
builder.Services.AddDbContextFactory<VRHajiDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddScoped<ISceneService, SceneService>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IValidationService, ValidationService>();

var app = builder.Build();

// Inisialisasi database + seed konten edukasi.
await using (var scope = app.Services.CreateAsyncScope())
{
    var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<VRHajiDbContext>>();
    await using var db = await factory.CreateDbContextAsync();
    await DbSeeder.SeedAsync(db);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}

app.UseAntiforgery();

// Fallback: sajikan file wwwroot yang belum masuk manifest MapStaticAssets
// (asset baru yang ditambahkan tanpa rebuild — mis. model glTF).
app.UseStaticFiles();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.MapGet("/api/tts", async (string text) =>
{
    // Menggunakan endpoint unofficial Google Translate TTS (gratis)
    var url = $"https://translate.google.com/translate_tts?ie=UTF-8&q={Uri.EscapeDataString(text)}&tl=id&client=tw-ob";
    using var client = new HttpClient();
    var response = await client.GetAsync(url);
    if (response.IsSuccessStatusCode)
    {
        var stream = await response.Content.ReadAsStreamAsync();
        return Results.File(stream, "audio/mpeg");
    }
    return Results.StatusCode(500);
});

app.Run();
