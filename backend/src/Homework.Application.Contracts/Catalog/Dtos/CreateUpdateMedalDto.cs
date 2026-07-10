using System.ComponentModel.DataAnnotations;

namespace Homework.Catalog.Dtos;

public class CreateUpdateMedalDto
{
    [Required, StringLength(64)] public string Name { get; set; } = string.Empty;
    [StringLength(512)] public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}
