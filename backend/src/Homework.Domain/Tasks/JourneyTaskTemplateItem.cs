using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Tasks;

/// <summary>旅程的周任务模板项（含奖励配置：指定道具或系统随机）。</summary>
public class JourneyTaskTemplateItem : FullAuditedAggregateRoot<Guid>
{
    public Guid SharedJourneyId { get; private set; }
    // 保留旧键：Chunk 3 的 C# 回填要读它，Chunk 6 才彻底删。新构造已不再写它。
    public Guid JourneyId { get; private set; }
    public DayOfWeek DayOfWeek { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Subject { get; private set; }
    public int Order { get; private set; }
    public int? EstimatedMinutes { get; private set; }
    public bool IsActive { get; private set; }
    public Guid? RewardItemId { get; private set; }
    public bool RewardIsRandom { get; private set; }

    protected JourneyTaskTemplateItem() { }

    public JourneyTaskTemplateItem(Guid id, Guid sharedJourneyId, DayOfWeek dayOfWeek, [NotNull] string title,
        string? subject = null, int order = 0, int? estimatedMinutes = null) : base(id)
    {
        SharedJourneyId = sharedJourneyId;
        DayOfWeek = dayOfWeek;
        SetTitle(title);
        Subject = subject;
        SetOrder(order);
        EstimatedMinutes = estimatedMinutes;
        IsActive = true;
        RewardIsRandom = true;
        RewardItemId = null;
    }

    public void SetSharedJourneyId(Guid id) => SharedJourneyId = id;

    /// <summary>迁移专用：回填前的旧数据用 JourneyId 关联到 Journey。随 JourneyId 字段在清理阶段(Chunk 6)一并移除。</summary>
    public JourneyTaskTemplateItem SetJourneyId(Guid journeyId) { JourneyId = journeyId; return this; }

    public JourneyTaskTemplateItem SetTitle([NotNull] string title)
    {
        Title = Check.NotNullOrWhiteSpace(title, nameof(title), maxLength: 128);
        return this;
    }

    public JourneyTaskTemplateItem SetOrder(int order)
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

    /// <summary>配置奖励：随机则忽略指定道具；否则记录指定道具。</summary>
    public void SetReward(Guid? rewardItemId, bool isRandom)
    {
        RewardIsRandom = isRandom;
        RewardItemId = isRandom ? null : rewardItemId;
    }
}
