using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Journeys;

/// <summary>共享计划：家长/老师建一份，多个孩子各建自己的 Journey 加入（挂 SharedJourneyId）。</summary>
public class SharedJourney : FullAuditedAggregateRoot<Guid>
{
    public Guid ParentId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public Guid MedalId { get; private set; }
    public SharedJourneyStatus Status { get; private set; }

    protected SharedJourney() { }

    public SharedJourney(Guid id, Guid parentId, [NotNull] string title,
        DateOnly startDate, DateOnly endDate, Guid medalId) : base(id)
    {
        ParentId = parentId;
        SetTitle(title);
        SetPeriod(startDate, endDate);
        MedalId = medalId;
        Status = SharedJourneyStatus.Draft;
    }

    public SharedJourney SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public SharedJourney SetDescription(string? description) { Description = description; return this; }

    public SharedJourney SetPeriod(DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate) throw new ArgumentException("endDate must be >= startDate", nameof(endDate));
        StartDate = startDate; EndDate = endDate; return this;
    }

    public SharedJourney SetMedal(Guid medalId) { MedalId = medalId; return this; }

    public void Activate() => Status = SharedJourneyStatus.Active;
}
