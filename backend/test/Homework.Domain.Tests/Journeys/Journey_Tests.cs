using System;
using System.Linq;
using Homework.Journeys;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Homework.Journeys;

public class Journey_Tests
{
    private static Journey NewDraft() => new(
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "2026年暑假",
        new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid());

    [Fact]
    public void Creates_As_Draft_Level1()
    {
        var j = NewDraft();
        j.Status.ShouldBe(JourneyStatus.Draft);
        j.CurrentLevel.ShouldBe(1);
        j.GrowthPoints.ShouldBe(0);
        j.PetSpeciesId.ShouldBeNull();
        j.Stages.ShouldBeEmpty();
        j.Backpack.ShouldBeEmpty();
    }

    [Fact]
    public void Rejects_Blank_Title()
    {
        Should.Throw<ArgumentException>(() => new Journey(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), " ",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid()));
    }

    [Fact]
    public void Rejects_End_Before_Start()
    {
        Should.Throw<ArgumentException>(() => new Journey(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "x",
            new DateOnly(2026, 8, 31), new DateOnly(2026, 7, 1), Guid.NewGuid()));
    }

    [Fact]
    public void Start_Sets_Active_Species_And_Stage_Snapshot()
    {
        var j = NewDraft();
        var species = Guid.NewGuid();
        j.Start(species, new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });

        j.Status.ShouldBe(JourneyStatus.Active);
        j.PetSpeciesId.ShouldBe(species);
        j.CurrentLevel.ShouldBe(1);
        j.Stages.Count.ShouldBe(5);
        j.Stages.Single(s => s.Level == 2).GrowthToNext.ShouldBe(40);
        j.Stages.Single(s => s.Level == 5).GrowthToNext.ShouldBeNull();
    }

    [Fact]
    public void Start_Twice_Rejected()
    {
        var j = NewDraft();
        j.Start(Guid.NewGuid(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
        Should.Throw<BusinessException>(() =>
            j.Start(Guid.NewGuid(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) }));
    }
}
