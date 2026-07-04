using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Scoring.Dtos;

public class FamilyGoalDto : EntityDto<Guid>
{
    public string Title { get; set; } = string.Empty;
    public int TargetStars { get; set; }
    public string? RewardText { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateTime? AchievedTime { get; set; }
    public int CurrentStars { get; set; }
    public bool IsAchieved { get; set; }
    public int ProgressPercent { get; set; }   // 0..100
}
