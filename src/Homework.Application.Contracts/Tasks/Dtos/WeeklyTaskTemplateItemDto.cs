using System;
using Volo.Abp.Application.Dtos;

namespace Homework.Tasks.Dtos;

public class WeeklyTaskTemplateItemDto : EntityDto<Guid>
{
    public Guid ChildId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public int Order { get; set; }
    public int? EstimatedMinutes { get; set; }
    public bool IsActive { get; set; }
}
