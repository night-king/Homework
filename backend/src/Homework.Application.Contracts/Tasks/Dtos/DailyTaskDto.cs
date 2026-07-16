using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Tasks.Dtos;
// TaskReviewState is in Homework.Tasks (Domain.Shared) — same parent namespace, no explicit using needed

public class DailyTaskDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int? EstimatedMinutes { get; set; }
    public int Order { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedTime { get; set; }
    public TaskReviewState ReviewState { get; set; }
    public bool CountsAsCompleted { get; set; }
    public Guid? SourceTemplateItemId { get; set; }
    public Guid JourneyId { get; set; }
    public Guid? RewardItemId { get; set; }
    public bool RewardGranted { get; set; }
}
