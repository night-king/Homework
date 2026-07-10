namespace Homework.Journeys.Dtos;

public class FeedResultDto
{
    public bool Evolved { get; set; }
    public int NewLevel { get; set; }
    public string? RevealText { get; set; }
    public string? EvolveVideoUrl { get; set; }
    public bool Completed { get; set; }
    public int CurrentLevel { get; set; }
    public int GrowthPoints { get; set; }
}
