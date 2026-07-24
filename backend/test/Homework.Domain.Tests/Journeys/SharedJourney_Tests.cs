using System;
using Homework.Journeys;
using Shouldly;
using Xunit;

namespace Homework.Journeys;

public class SharedJourney_Tests
{
    private static SharedJourney NewDraft() => new(
        Guid.NewGuid(), Guid.NewGuid(), "2026年暑假共享计划",
        new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid());

    [Fact]
    public void Creates_As_Draft_With_Period()
    {
        var sj = NewDraft();
        sj.Status.ShouldBe(SharedJourneyStatus.Draft);
        sj.StartDate.ShouldBe(new DateOnly(2026, 7, 1));
        sj.EndDate.ShouldBe(new DateOnly(2026, 8, 31));
    }

    [Fact]
    public void Rejects_Blank_Title()
    {
        Should.Throw<ArgumentException>(() => new SharedJourney(
            Guid.NewGuid(), Guid.NewGuid(), " ",
            new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 31), Guid.NewGuid()));
    }

    [Fact]
    public void SetPeriod_Rejects_End_Before_Start()
    {
        var sj = NewDraft();
        Should.Throw<ArgumentException>(() =>
            sj.SetPeriod(new DateOnly(2026, 8, 31), new DateOnly(2026, 7, 1)));
    }

    [Fact]
    public void Activate_Is_Idempotent_Draft_To_Active()
    {
        var sj = NewDraft();
        sj.Activate();
        sj.Status.ShouldBe(SharedJourneyStatus.Active);
        sj.Activate();
        sj.Status.ShouldBe(SharedJourneyStatus.Active);
    }
}
