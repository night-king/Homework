using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Tasks;

/// <summary>某孩子某天的一条任务（由模板惰性生成，可被家长临时增改）。</summary>
public class DailyTask : FullAuditedAggregateRoot<Guid>
{
    public Guid ChildId { get; private set; }
    public DateOnly Date { get; private set; }
    public string Title { get; private set; }
    public string? Subject { get; private set; }
    public int Order { get; private set; }
    public Guid? SourceTemplateItemId { get; private set; }
    public Guid JourneyId { get; private set; }
    public Guid? RewardItemId { get; private set; }
    public bool RewardGranted { get; private set; }
    public bool IsCompleted { get; private set; }
    public DateTime? CompletedTime { get; private set; }
    public TaskReviewState ReviewState { get; private set; }

    protected DailyTask()
    {
    }

    public DailyTask(
        Guid id, Guid childId, Guid journeyId, DateOnly date, [NotNull] string title,
        string? subject = null, int order = 0, Guid? sourceTemplateItemId = null, Guid? rewardItemId = null)
        : base(id)
    {
        ChildId = childId;
        JourneyId = journeyId;
        Date = date;
        SetTitle(title);
        SetSubject(subject);
        Order = order < 0 ? 0 : order;
        SourceTemplateItemId = sourceTemplateItemId;
        RewardItemId = rewardItemId;
        RewardGranted = false;
        IsCompleted = false;
        ReviewState = TaskReviewState.Normal;
    }

    public DailyTask SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public DailyTask SetSubject(string? subject)
    {
        Subject = subject;
        return this;
    }

    public DailyTask SetOrder(int order)
    {
        if (order < 0)
        {
            throw new ArgumentException("order must be >= 0", nameof(order));
        }

        Order = order;
        return this;
    }

    /// <summary>孩子打勾完成（即时反馈）。</summary>
    public void Complete(DateTime now)
    {
        IsCompleted = true;
        CompletedTime = now;
        ReviewState = TaskReviewState.Normal;
    }

    /// <summary>取消完成（孩子误点）。</summary>
    public void Uncomplete()
    {
        IsCompleted = false;
        CompletedTime = null;
    }

    /// <summary>家长撤销异常打卡：记分时视为未完成，但保留痕迹（spec §4.2）。</summary>
    public void Revoke() => ReviewState = TaskReviewState.Revoked;

    public void Restore() => ReviewState = TaskReviewState.Normal;

    public void MarkRewardGranted() => RewardGranted = true;
    public void ClearRewardGranted() => RewardGranted = false;

    /// <summary>是否计入"已完成"（打勾完成且未被家长撤销）。</summary>
    public bool CountsAsCompleted => IsCompleted && ReviewState == TaskReviewState.Normal;
}
