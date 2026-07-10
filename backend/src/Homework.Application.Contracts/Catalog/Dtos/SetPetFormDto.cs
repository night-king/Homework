using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class SetPetFormDto
{
    [Range(1, 5)] public int Level { get; set; }
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [StringLength(128)] public string? RevealText { get; set; }
    public int? GrowthToNext { get; set; }
    public decimal? Scale { get; set; }
}
