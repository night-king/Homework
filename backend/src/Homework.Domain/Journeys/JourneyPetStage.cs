using System;
using Volo.Abp.Domain.Entities;

namespace Homework.Journeys;

/// <summary>旅程开始时对某宠物某阶「进化到下一阶所需阈值」的快照（复合键 JourneyId+Level）。</summary>
public class JourneyPetStage : Entity
{
    public Guid JourneyId { get; private set; }
    public int Level { get; private set; }
    public int? GrowthToNext { get; private set; }

    protected JourneyPetStage() { }

    public JourneyPetStage(Guid journeyId, int level, int? growthToNext)
    {
        JourneyId = journeyId;
        Level = level;
        GrowthToNext = growthToNext;
    }

    public override object[] GetKeys() => new object[] { JourneyId, Level };
}
