using System;
using System.ComponentModel.DataAnnotations;

namespace Homework.Tasks.Dtos;

public class UpdateJourneyTaskTemplateItemDto
{
    [Required, StringLength(128)] public string Title { get; set; } = string.Empty;
    [StringLength(64)] public string? Subject { get; set; }
    [Range(0, int.MaxValue)] public int Order { get; set; }
    [Range(1, 600)] public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardIsRandom { get; set; } = true;
}
