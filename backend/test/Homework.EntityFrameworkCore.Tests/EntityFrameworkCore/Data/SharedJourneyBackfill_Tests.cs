using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Data;
using Homework.Journeys;
using Homework.Tasks;
using Shouldly;
using Volo.Abp.Data;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Xunit;

namespace Homework.EntityFrameworkCore.Data;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class SharedJourneyBackfill_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly SharedJourneyBackfillContributor _backfill;
    private readonly IRepository<Journey, Guid> _journeyRepo;
    private readonly IRepository<SharedJourney, Guid> _sharedRepo;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepo;
    private readonly IGuidGenerator _guid;

    public SharedJourneyBackfill_Tests()
    {
        _backfill = GetRequiredService<SharedJourneyBackfillContributor>();
        _journeyRepo = GetRequiredService<IRepository<Journey, Guid>>();
        _sharedRepo = GetRequiredService<IRepository<SharedJourney, Guid>>();
        _templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
    }

    private static readonly DateOnly Start = new(2026, 7, 1);
    private static readonly DateOnly End = new(2026, 8, 31);

    /// <summary>构造一条回填前的旧 Journey：SharedJourneyId 为 Guid.Empty（哨兵值）。</summary>
    private Journey NewOrphanJourney(Guid parentId, string title, bool active)
    {
        var j = new Journey(_guid.Create(), Guid.Empty, parentId, _guid.Create(), title, Start, End, _guid.Create());
        j.SetDescription($"{title} 的描述");
        if (active)
        {
            j.Start(_guid.Create(), new (int, int?)[] { (1, 20), (2, 40), (3, 60), (4, 80), (5, null) });
        }

        return j;
    }

    /// <summary>构造一条旧模板：新构造 sharedJourneyId 传 Guid.Empty，再用迁移专用 setter 关联到 Journey。</summary>
    private JourneyTaskTemplateItem NewLegacyTemplate(Guid journeyId, DayOfWeek dow, string title)
    {
        return new JourneyTaskTemplateItem(_guid.Create(), Guid.Empty, dow, title).SetJourneyId(journeyId);
    }

    [Fact]
    public async Task Backfill_Wraps_Orphan_Journey_And_Repoints_Templates()
    {
        var parentId = _guid.Create();
        Guid journeyId = default, templateId = default;

        await WithUnitOfWorkAsync(async () =>
        {
            var j = NewOrphanJourney(parentId, "夏", active: true);
            journeyId = j.Id;
            await _journeyRepo.InsertAsync(j, autoSave: true);

            var t = NewLegacyTemplate(journeyId, DayOfWeek.Monday, "周一任务");
            templateId = t.Id;
            await _templateRepo.InsertAsync(t, autoSave: true);
        });

        await WithUnitOfWorkAsync(() => _backfill.SeedAsync(new DataSeedContext()));

        await WithUnitOfWorkAsync(async () =>
        {
            var shared = await _sharedRepo.GetListAsync();
            shared.Count.ShouldBe(1);
            var sj = shared.Single();
            sj.ParentId.ShouldBe(parentId);
            sj.Title.ShouldBe("夏");
            sj.Description.ShouldBe("夏 的描述");
            sj.StartDate.ShouldBe(Start);
            sj.EndDate.ShouldBe(End);
            // Journey 是 Active（非 Draft）→ SharedJourney 应被激活
            sj.Status.ShouldBe(SharedJourneyStatus.Active);

            var journey = await _journeyRepo.GetAsync(journeyId);
            journey.SharedJourneyId.ShouldBe(sj.Id);

            var template = await _templateRepo.GetAsync(templateId);
            template.SharedJourneyId.ShouldBe(sj.Id);
        });
    }

    [Fact]
    public async Task Backfill_Is_Idempotent()
    {
        var parentId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
        {
            var j = NewOrphanJourney(parentId, "夏", active: false);
            await _journeyRepo.InsertAsync(j, autoSave: true);
        });

        await WithUnitOfWorkAsync(() => _backfill.SeedAsync(new DataSeedContext()));

        Guid firstSjId = default;
        await WithUnitOfWorkAsync(async () =>
        {
            var shared = await _sharedRepo.GetListAsync();
            shared.Count.ShouldBe(1);
            firstSjId = shared.Single().Id;
        });

        // 第二次运行：不应新建任何 SharedJourney，id 稳定
        await WithUnitOfWorkAsync(() => _backfill.SeedAsync(new DataSeedContext()));

        await WithUnitOfWorkAsync(async () =>
        {
            var shared = await _sharedRepo.GetListAsync();
            shared.Count.ShouldBe(1);
            shared.Single().Id.ShouldBe(firstSjId);
        });
    }

    [Fact]
    public async Task Backfill_Empty_Db_NoOp()
    {
        // 无任何 Journey → 运行不抛错，且不产生 SharedJourney
        await WithUnitOfWorkAsync(() => _backfill.SeedAsync(new DataSeedContext()));

        await WithUnitOfWorkAsync(async () =>
        {
            (await _sharedRepo.GetCountAsync()).ShouldBe(0);
        });
    }

    [Fact]
    public async Task Backfill_Two_Journeys_Get_Separate_SharedJourneys()
    {
        var parentId = _guid.Create();
        Guid jA = default, jB = default, tA = default, tB = default;

        await WithUnitOfWorkAsync(async () =>
        {
            var a = NewOrphanJourney(parentId, "旅程A", active: false);
            jA = a.Id;
            await _journeyRepo.InsertAsync(a, autoSave: true);
            var ta = NewLegacyTemplate(jA, DayOfWeek.Tuesday, "A的周二");
            tA = ta.Id;
            await _templateRepo.InsertAsync(ta, autoSave: true);

            var b = NewOrphanJourney(parentId, "旅程B", active: false);
            jB = b.Id;
            await _journeyRepo.InsertAsync(b, autoSave: true);
            var tb = NewLegacyTemplate(jB, DayOfWeek.Wednesday, "B的周三");
            tB = tb.Id;
            await _templateRepo.InsertAsync(tb, autoSave: true);
        });

        await WithUnitOfWorkAsync(() => _backfill.SeedAsync(new DataSeedContext()));

        await WithUnitOfWorkAsync(async () =>
        {
            var shared = await _sharedRepo.GetListAsync();
            shared.Count.ShouldBe(2);

            var journeyA = await _journeyRepo.GetAsync(jA);
            var journeyB = await _journeyRepo.GetAsync(jB);
            journeyA.SharedJourneyId.ShouldNotBe(Guid.Empty);
            journeyB.SharedJourneyId.ShouldNotBe(Guid.Empty);
            journeyA.SharedJourneyId.ShouldNotBe(journeyB.SharedJourneyId);

            var templateA = await _templateRepo.GetAsync(tA);
            var templateB = await _templateRepo.GetAsync(tB);
            templateA.SharedJourneyId.ShouldBe(journeyA.SharedJourneyId);
            templateB.SharedJourneyId.ShouldBe(journeyB.SharedJourneyId);

            // 各自的 SharedJourney 标题应与 Journey 一致
            var sjA = shared.Single(s => s.Id == journeyA.SharedJourneyId);
            var sjB = shared.Single(s => s.Id == journeyB.SharedJourneyId);
            sjA.Title.ShouldBe("旅程A");
            sjB.Title.ShouldBe("旅程B");
        });
    }
}
