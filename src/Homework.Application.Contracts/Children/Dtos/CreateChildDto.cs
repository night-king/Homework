using System.ComponentModel.DataAnnotations;
using Homework.Children;

namespace Homework.Children.Dtos;

public class CreateChildDto
{
    [Required, StringLength(32)] public string DisplayName { get; set; } = string.Empty;
    [Range(GradeConsts.Min, GradeConsts.Max)] public int Grade { get; set; }
    [StringLength(64)] public string? AvatarKey { get; set; }
}
