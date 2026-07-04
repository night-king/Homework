using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Tasks;

/// <summary>孩子每周某个星期几的一条任务模板；系统按此惰性生成每日任务（spec §4.1）。</summary>
public class WeeklyTaskTemplateItem : FullAuditedAggregateRoot<Guid>
{
    public Guid ChildId { get; private set; }
    public DayOfWeek DayOfWeek { get; private set; }
    public string Title { get; private set; }
    public string? Subject { get; private set; }
    public int Order { get; private set; }
    public int? EstimatedMinutes { get; private set; }
    public bool IsActive { get; private set; }

    protected WeeklyTaskTemplateItem()
    {
    }

    public WeeklyTaskTemplateItem(
        Guid id, Guid childId, DayOfWeek dayOfWeek, [NotNull] string title,
        string? subject = null, int order = 0, int? estimatedMinutes = null)
        : base(id)
    {
        ChildId = childId;
        DayOfWeek = dayOfWeek;
        SetTitle(title);
        Subject = subject;
        SetOrder(order);
        EstimatedMinutes = estimatedMinutes;
        IsActive = true;
    }

    public WeeklyTaskTemplateItem SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public WeeklyTaskTemplateItem SetOrder(int order)
    {
        if (order < 0)
        {
            throw new ArgumentException("order must be >= 0", nameof(order));
        }

        Order = order;
        return this;
    }

    public void SetSubject(string? subject) => Subject = subject;
    public void SetEstimatedMinutes(int? minutes) => EstimatedMinutes = minutes;
    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;
}
