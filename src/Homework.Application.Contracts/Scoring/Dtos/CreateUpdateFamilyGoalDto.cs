using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Scoring.Dtos;

public class CreateUpdateFamilyGoalDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [Range(1, int.MaxValue)] public int TargetStars { get; set; }
    [StringLength(256)] public string? RewardText { get; set; }
    [Required] public DateOnly StartDate { get; set; }
    [Required] public DateOnly EndDate { get; set; }
}
