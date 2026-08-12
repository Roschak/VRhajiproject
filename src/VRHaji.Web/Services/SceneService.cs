using System.Text.Json;
using VRHaji.Web.Data;
using VRHaji.Web.Interfaces;
using VRHaji.Web.Models;

namespace VRHaji.Web.Services;

/// <summary>Implementasi manajemen scene berbasis in-memory static data.</summary>
public class SceneService : ISceneService
{
    public Task<IReadOnlyList<SceneData>> GetAllScenesAsync()
    {
        return Task.FromResult<IReadOnlyList<SceneData>>(DbSeeder.Scenes.OrderBy(s => s.Urutan).ToList());
    }

    public Task<SceneData?> GetSceneByUrutanAsync(int urutan)
    {
        var scene = DbSeeder.Scenes.FirstOrDefault(s => s.Urutan == urutan);
        if (scene != null)
        {
            scene.Checkpoints = DbSeeder.Checkpoints.Where(c => c.SceneId == scene.Id).ToList();
        }
        return Task.FromResult(scene);
    }

    public Task<IReadOnlyList<CheckpointData>> GetCheckpointsAsync(int sceneId)
    {
        return Task.FromResult<IReadOnlyList<CheckpointData>>(DbSeeder.Checkpoints.Where(c => c.SceneId == sceneId).OrderBy(c => c.Urutan).ToList());
    }

    public EdukasiContent? ParseEdukasi(SceneData scene) =>
        JsonSerializer.Deserialize<EdukasiContent>(scene.EdukasiJson);

    public IReadOnlyList<CheckpointQuestion> ParseQuestions(CheckpointData checkpoint) =>
        JsonSerializer.Deserialize<List<CheckpointQuestion>>(checkpoint.QuestionsJson) ?? [];
}
