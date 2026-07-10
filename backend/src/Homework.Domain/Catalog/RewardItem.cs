using System;
using JetBrains.Annotations;
using Volo.Abp;
using Volo.Abp.Domain.Entities.Auditing;

namespace Homework.Catalog;

/// <summary>全局奖励道具图鉴项（星火书签 / 共鸣号角 / 留存果实 …）。</summary>
public class RewardItem : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? IconObjectKey { get; private set; }
    public string? Glyph { get; private set; }
    public int GrowthValue { get; private set; }
    public int RandomWeight { get; private set; }
    public bool IsActive { get; private set; }
    public int DisplayOrder { get; private set; }

    protected RewardItem() { }

    public RewardItem(Guid id, [NotNull] string name, int growthValue = 12, int randomWeight = 1)
        : base(id)
    {
        SetName(name);
        SetGrowthValue(growthValue);
        SetRandomWeight(randomWeight);
        IsActive = false;
    }

    public RewardItem SetName([NotNull] string name)
    {
        Name = Check.NotNullOrWhiteSpace(name, nameof(name), maxLength: 64);
        return this;
    }

    public RewardItem SetGrowthValue(int growthValue)
    {
        if (growthValue <= 0)
        {
            throw new ArgumentException("growthValue must be positive", nameof(growthValue));
        }

        GrowthValue = growthValue;
        return this;
    }

    public RewardItem SetRandomWeight(int randomWeight)
    {
        if (randomWeight < 0)
        {
            throw new ArgumentException("randomWeight must be >= 0", nameof(randomWeight));
        }

        RandomWeight = randomWeight;
        return this;
    }

    public void SetIcon(string? iconObjectKey) => IconObjectKey = iconObjectKey;

    public void SetGlyph(string? glyph) => Glyph = glyph;

    public void SetDisplayOrder(int displayOrder) => DisplayOrder = displayOrder;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
