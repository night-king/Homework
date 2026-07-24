using System;
using Homework.Journeys;
using Homework.Tasks;

namespace Homework;

public static class JourneyTestFactory
{
    public static SharedJourney NewSharedJourney(Guid parentId, Guid? id = null,
        DateOnly? start = null, DateOnly? end = null, Guid? medalId = null, string title = "旅程")
        => new(id ?? Guid.NewGuid(), parentId, title,
               start ?? new DateOnly(2026, 7, 1), end ?? new DateOnly(2026, 8, 31), medalId ?? Guid.NewGuid());

    // Draft Journey hung on a SharedJourney (plan copy from sj)
    public static Journey NewJourney(SharedJourney sj, Guid childId, Guid? id = null)
        => new(id ?? Guid.NewGuid(), sj.Id, sj.ParentId, childId, sj.Title, sj.StartDate, sj.EndDate, sj.MedalId);

    public static JourneyTaskTemplateItem NewTemplate(Guid sharedJourneyId, DayOfWeek dow,
        string title = "任务", int order = 0)
        => new(Guid.NewGuid(), sharedJourneyId, dow, title, order: order);
}
