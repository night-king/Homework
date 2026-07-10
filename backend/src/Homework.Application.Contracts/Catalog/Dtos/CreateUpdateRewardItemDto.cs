using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class CreateUpdateRewardItemDto
{
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [StringLength(8)] public string? Glyph { get; set; }
    [Range(1, int.MaxValue)] public int GrowthValue { get; set; } = 12;
    [Range(0, int.MaxValue)] public int RandomWeight { get; set; } = 1;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}
