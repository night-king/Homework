using System;
using System.Threading.Tasks;
using Homework.Journeys;
using Homework.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;

namespace Homework.Data;

/// <summary>
/// 一次性回填:把回填前的旧数据迁入共享旅程模型(幂等,可重复运行)。
/// 每个仍带哨兵值 <c>SharedJourneyId == Guid.Empty</c> 的 Journey 会被包进一个专属的「单人」SharedJourney,
/// 其模板(经保留的 JourneyId 找到)改指向新建的 SharedJourney。
/// 随 DbMigrator 的数据种子阶段在 schema 迁移后运行;第二次运行找不到孤儿 Journey 即什么都不做。
/// </summary>
public class SharedJourneyBackfillContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<SharedJourney, Guid> _sharedJourneyRepository;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepository;
    private readonly IGuidGenerator _guidGenerator;

    public ILogger<SharedJourneyBackfillContributor> Logger { get; set; }
        = NullLogger<SharedJourneyBackfillContributor>.Instance;

    public SharedJourneyBackfillContributor(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<SharedJourney, Guid> sharedJourneyRepository,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepository,
        IGuidGenerator guidGenerator)
    {
        _journeyRepository = journeyRepository;
        _sharedJourneyRepository = sharedJourneyRepository;
        _templateRepository = templateRepository;
        _guidGenerator = guidGenerator;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        // 1) 找出孤儿 Journey(仍带哨兵值)。无 → 直接返回(幂等 + 空库无操作)。
        var orphans = await _journeyRepository.GetListAsync(j => j.SharedJourneyId == Guid.Empty);
        if (orphans.Count == 0)
        {
            return;
        }

        var templatesRepointed = 0;
        foreach (var journey in orphans)
        {
            // 2) 为该 Journey 新建一个专属「单人」SharedJourney,复制 Title/日期/勋章/描述。
            var sharedJourney = new SharedJourney(
                _guidGenerator.Create(),
                journey.ParentId,
                journey.Title,
                journey.StartDate,
                journey.EndDate,
                journey.MedalId);
            sharedJourney.SetDescription(journey.Description);
            if (journey.Status != JourneyStatus.Draft)
            {
                sharedJourney.Activate();
            }

            await _sharedJourneyRepository.InsertAsync(sharedJourney, autoSave: true);

            // 3) Journey 改挂新建的 SharedJourney。
            journey.SetSharedJourneyId(sharedJourney.Id);
            await _journeyRepository.UpdateAsync(journey, autoSave: true);

            // 4) 该 Journey 的模板(经保留的 JourneyId 找到)改指向新建的 SharedJourney。
            var templates = await _templateRepository.GetListAsync(t => t.JourneyId == journey.Id);
            foreach (var template in templates)
            {
                template.SetSharedJourneyId(sharedJourney.Id);
                await _templateRepository.UpdateAsync(template, autoSave: true);
                templatesRepointed++;
            }
        }

        // 线上跑一次性迁移时,用这行核对回填规模。
        Logger.LogWarning(
            "SharedJourney 回填完成:包裹了 {JourneyCount} 条旧旅程,改指了 {TemplateCount} 个模板。",
            orphans.Count, templatesRepointed);
    }
}
