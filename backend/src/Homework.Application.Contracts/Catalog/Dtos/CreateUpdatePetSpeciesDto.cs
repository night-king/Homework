using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class CreateUpdatePetSpeciesDto
{
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [Required, StringLength(64)] public string Code { get; set; } = string.Empty;
    [StringLength(16)] public string? AccentColor { get; set; }
    [StringLength(512)] public string? Description { get; set; }
    public int DisplayOrder { get; set; }
}
