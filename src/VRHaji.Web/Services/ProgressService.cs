using Microsoft.JSInterop;
using System.Text.Json;
using VRHaji.Web.Interfaces;
using VRHaji.Web.Models;

namespace VRHaji.Web.Services;

/// <summary>Implementasi tracking progress berbasis LocalStorage (tanpa database).</summary>
public class ProgressService(IJSRuntime js) : IProgressService
{
    private const string StorageKey = "vr_haji_progress";

    private async Task<List<UserProgress>> LoadAllAsync()
    {
        try
        {
            var json = await js.InvokeAsync<string>("localStorage.getItem", StorageKey);
            if (!string.IsNullOrEmpty(json))
                return JsonSerializer.Deserialize<List<UserProgress>>(json) ?? new();
        }
        catch { }
        return new();
    }

    private async Task SaveAllAsync(List<UserProgress> list)
    {
        var json = JsonSerializer.Serialize(list);
        await js.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
    }

    public async Task<IReadOnlyList<UserProgress>> GetProgressAsync(string userId)
    {
        var all = await LoadAllAsync();
        return all.Where(p => p.UserId == userId).ToList();
    }

    public async Task<int> GetHighestCompletedSceneAsync(string userId)
    {
        var all = await LoadAllAsync();
        var completed = all.Where(p => p.UserId == userId && p.Completed && p.CheckpointId == 0)
                           .Select(p => p.SceneId).ToList();
        var highest = 0;
        while (completed.Contains(highest + 1)) highest++;
        return highest;
    }

    public async Task SaveCheckpointAsync(string userId, int sceneId, int checkpointId, int skor)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;
        var all = await LoadAllAsync();
        var existing = all.FirstOrDefault(p => p.UserId == userId && p.SceneId == sceneId && p.CheckpointId == checkpointId);
        
        if (existing is null)
        {
            all.Add(new UserProgress
            {
                UserId = userId, SceneId = sceneId, CheckpointId = checkpointId,
                Completed = true, Skor = skor, CompletedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.Completed = true;
            existing.Skor = Math.Max(existing.Skor, skor);
            existing.CompletedAt = DateTime.UtcNow;
        }
        await SaveAllAsync(all);
    }

    public async Task ResetAsync(string userId)
    {
        var all = await LoadAllAsync();
        all.RemoveAll(p => p.UserId == userId);
        await SaveAllAsync(all);
    }
}
