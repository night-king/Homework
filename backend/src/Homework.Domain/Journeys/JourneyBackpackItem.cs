using System;
using Volo.Abp.Domain.Entities;

namespace Homework.Journeys;

/// <summary>旅程背包里某道具的持有数量（已获得未喂养；复合键 JourneyId+RewardItemId）。</summary>
public class JourneyBackpackItem : Entity
{
    public Guid JourneyId { get; private set; }
    public Guid RewardItemId { get; private set; }
    public int Quantity { get; private set; }

    protected JourneyBackpackItem() { }

    public JourneyBackpackItem(Guid journeyId, Guid rewardItemId, int quantity)
    {
        JourneyId = journeyId;
        RewardItemId = rewardItemId;
        Quantity = quantity;
    }

    public void Increment(int by) => Quantity += by;

    public void Decrement(int by) => Quantity -= by;

    public override object[] GetKeys() => new object[] { JourneyId, RewardItemId };
}
