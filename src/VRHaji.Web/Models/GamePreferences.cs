namespace VRHaji.Web.Models;
public sealed class GamePreferences
{
    public string Name { get; set; } = "Jemaah";
    public string Gender { get; set; } = "man";
    public string Outfit { get; set; } = "robe";
    public string SkinTone { get; set; } = "#b9825b";
    public double Resolution { get; set; } = .75;
    public bool Shadows { get; set; }
    public int Fps { get; set; }
    public double Volume { get; set; } = .7;
    public bool Narration { get; set; } = true;
    public double Sensitivity { get; set; } = 1;
    public int SnapAngle { get; set; } = 30;
}
