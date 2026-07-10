namespace Homework.Catalog.Dtos;

public class PetFormDto
{
    public int Level { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SpriteUrl { get; set; }
    public string? RevealText { get; set; }
    public int? GrowthToNext { get; set; }
    public string? EvolveVideoUrl { get; set; }
    public decimal? Scale { get; set; }
}
