using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using VRHaji.Web.Components;
using VRHaji.Web.Interfaces;
using VRHaji.Web.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped<ISceneService, SceneService>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IValidationService, ValidationService>();

await builder.Build().RunAsync();
