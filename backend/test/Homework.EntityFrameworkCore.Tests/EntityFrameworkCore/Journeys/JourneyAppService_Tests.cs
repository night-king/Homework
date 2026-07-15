using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys;
using Homework.Journeys.Dtos;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Shouldly;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Security.Claims;
using Xunit;

namespace Homework.EntityFrameworkCore.Journeys;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class JourneyAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IJourneyAppService _service;
    private readonly IRepository<ChildProfile, Guid> _childRepo;
    private readonly IGuidGenerator _guid;
    private readonly ICurrentPrincipalAccessor _principal;

    public JourneyAppService_Tests()
    {
        _service = GetRequiredService<IJourneyAppService>();
        _childRepo = GetRequiredService<IRepository<ChildProfile, Guid>>();
        _guid = GetRequiredService<IGuidGenerator>();
        _principal = GetRequiredService<ICurrentPrincipalAccessor>();
    }

    private static ClaimsPrincipal Parent(Guid id) => new(new ClaimsIdentity(
        new[] { new Claim(AbpClaimTypes.UserId, id.ToString()) }, "test"));

    private async Task<Guid> SeedChildAsync(Guid parentId)
    {
        var childId = _guid.Create();
        await WithUnitOfWorkAsync(async () =>
            await _childRepo.InsertAsync(new ChildProfile(childId, parentId, "娃", 3)));
        return childId;
    }

    [Fact]
    public async Task Create_Then_Get()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var medalId = _guid.Create();

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "暑假之旅", Description = "背单词",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = medalId
            });
            created.ChildId.ShouldBe(childId);
            created.Title.ShouldBe("暑假之旅");
            created.Description.ShouldBe("背单词");
            created.MedalId.ShouldBe(medalId);
            created.Status.ShouldBe(JourneyStatus.Draft);
            created.CurrentLevel.ShouldBe(1);

            var fetched = await _service.GetAsync(created.Id);
            fetched.Id.ShouldBe(created.Id);
            fetched.Title.ShouldBe("暑假之旅");
            fetched.StartDate.ShouldBe(new DateOnly(2026, 7, 1));
            fetched.EndDate.ShouldBe(new DateOnly(2026, 8, 31));

            var list = await _service.GetListAsync(new GetJourneyListInput { ChildId = childId });
            list.Items.Count.ShouldBe(1);
        }
    }

    [Fact]
    public async Task Update_Changes_Fields()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);

        using (_principal.Change(Parent(pid)))
        {
            var created = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "旧标题", Description = "旧描述",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });

            var newMedal = _guid.Create();
            var updated = await _service.UpdateAsync(created.Id, new UpdateJourneyDto
            {
                Title = "新标题", Description = null,
                StartDate = new DateOnly(2026, 9, 1), EndDate = new DateOnly(2026, 9, 30),
                MedalId = newMedal
            });
            updated.Title.ShouldBe("新标题");
            updated.Description.ShouldBeNull();
            updated.StartDate.ShouldBe(new DateOnly(2026, 9, 1));
            updated.EndDate.ShouldBe(new DateOnly(2026, 9, 30));
            updated.MedalId.ShouldBe(newMedal);
        }
    }

    [Fact]
    public async Task CrossParent_Get_Throws()
    {
        var owner = _guid.Create();
        var childId = await SeedChildAsync(owner);
        Guid journeyId;

        using (_principal.Change(Parent(owner)))
        {
            var created = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "私有旅程",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            journeyId = created.Id;
        }

        var stranger = _guid.Create();
        using (_principal.Change(Parent(stranger)))
        {
            await Should.ThrowAsync<EntityNotFoundException>(async () =>
                await _service.GetAsync(journeyId));
        }
    }

    [Fact]
    public async Task Delete_Also_Removes_Its_Task_Templates()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var templateService = GetRequiredService<Homework.Tasks.IJourneyTaskTemplateAppService>();
        var templateRepo = GetRequiredService<IRepository<JourneyTaskTemplateItem, Guid>>();
        Guid journeyId;

        using (_principal.Change(Parent(pid)))
        {
            var journey = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "旅程",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            journeyId = journey.Id;
            await templateService.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journeyId, DayOfWeek = DayOfWeek.Monday, Title = "背单词", Order = 0, RewardIsRandom = true
            });
            await templateService.CreateAsync(new CreateJourneyTaskTemplateItemDto
            {
                JourneyId = journeyId, DayOfWeek = DayOfWeek.Tuesday, Title = "读书", Order = 0, RewardIsRandom = true
            });
        }

        await WithUnitOfWorkAsync(async () =>
        {
            var items = await templateRepo.GetListAsync(t => t.JourneyId == journeyId);
            items.Count.ShouldBe(2);
        });

        using (_principal.Change(Parent(pid)))
        {
            await _service.DeleteAsync(journeyId);
        }

        await WithUnitOfWorkAsync(async () =>
        {
            var items = await templateRepo.GetListAsync(t => t.JourneyId == journeyId);
            items.Count.ShouldBe(0);
        });
    }

    /// <summary>
    /// 删旅程只清模板不够：已生成的 DailyTask 会留成孤儿。真机复现过——看板按 childId+date 查，
    /// 于是仍返回指向已删除旅程的任务，还占住那些日期让新旅程生成不出任务。
    /// </summary>
    [Fact]
    public async Task Delete_Also_Removes_Its_Generated_Daily_Tasks()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var taskRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        Guid journeyId;

        using (_principal.Change(Parent(pid)))
        {
            var journey = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "旅程",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            journeyId = journey.Id;
        }

        await WithUnitOfWorkAsync(async () =>
        {
            await taskRepo.InsertAsync(new DailyTask(
                _guid.Create(), childId, journeyId, new DateOnly(2026, 7, 6), "口算"));
            await taskRepo.InsertAsync(new DailyTask(
                _guid.Create(), childId, journeyId, new DateOnly(2026, 7, 7), "阅读"));
        });

        await WithUnitOfWorkAsync(async () =>
        {
            var tasks = await taskRepo.GetListAsync(t => t.JourneyId == journeyId);
            tasks.Count.ShouldBe(2);
        });

        using (_principal.Change(Parent(pid)))
        {
            await _service.DeleteAsync(journeyId);
        }

        await WithUnitOfWorkAsync(async () =>
        {
            var tasks = await taskRepo.GetListAsync(t => t.JourneyId == journeyId);
            tasks.Count.ShouldBe(0);
        });
    }

    /// <summary>删旅程不能误伤同一个孩子在别的旅程下的任务。</summary>
    [Fact]
    public async Task Delete_Keeps_Daily_Tasks_Of_Other_Journeys()
    {
        var pid = _guid.Create();
        var childId = await SeedChildAsync(pid);
        var taskRepo = GetRequiredService<IRepository<DailyTask, Guid>>();
        Guid doomedId, keptId;

        using (_principal.Change(Parent(pid)))
        {
            var doomed = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "要删的",
                StartDate = new DateOnly(2026, 7, 1), EndDate = new DateOnly(2026, 8, 31),
                MedalId = _guid.Create()
            });
            var kept = await _service.CreateAsync(new CreateJourneyDto
            {
                ChildId = childId, Title = "留着的",
                StartDate = new DateOnly(2026, 9, 1), EndDate = new DateOnly(2026, 10, 31),
                MedalId = _guid.Create()
            });
            doomedId = doomed.Id;
            keptId = kept.Id;
        }

        await WithUnitOfWorkAsync(async () =>
        {
            await taskRepo.InsertAsync(new DailyTask(_guid.Create(), childId, doomedId, new DateOnly(2026, 7, 6), "口算"));
            await taskRepo.InsertAsync(new DailyTask(_guid.Create(), childId, keptId, new DateOnly(2026, 9, 7), "阅读"));
        });

        using (_principal.Change(Parent(pid)))
        {
            await _service.DeleteAsync(doomedId);
        }

        await WithUnitOfWorkAsync(async () =>
        {
            (await taskRepo.GetListAsync(t => t.JourneyId == doomedId)).Count.ShouldBe(0);
            (await taskRepo.GetListAsync(t => t.JourneyId == keptId)).Count.ShouldBe(1);
        });
    }
}
