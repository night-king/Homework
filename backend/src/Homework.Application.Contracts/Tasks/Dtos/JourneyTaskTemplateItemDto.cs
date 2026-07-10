using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Tasks.Dtos;

public class JourneyTaskTemplateItemDto : EntityDto<Guid>
{
    public Guid JourneyId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int Order { get; set; }
    public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardIsRandom { get; set; }
}
