using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Volo.Abp.Users;

namespace Homework.Journeys;

/// <summary>共享计划的建单与家庭归属校验：当前登录家长只能碰自己名下的共享计划。</summary>
public class SharedJourneyManager : DomainService
{
    private readonly IRepository<SharedJourney, Guid> _repository;
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepository;
    private readonly ChildProfileManager _childManager;
    private readonly ICurrentUser _currentUser;

    public SharedJourneyManager(
        IRepository<SharedJourney, Guid> repository,
        IRepository<Journey, Guid> journeyRepository,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepository,
        ChildProfileManager childManager,
        ICurrentUser currentUser)
    {
        _repository = repository;
        _journeyRepository = journeyRepository;
        _templateRepository = templateRepository;
        _childManager = childManager;
        _currentUser = currentUser;
    }

    private Guid CurrentParentId => _currentUser.Id
        ?? throw new AbpException("User not authenticated.");

    /// <summary>当前家长新建一份共享计划（Draft）。</summary>
    public async Task<SharedJourney> CreateAsync(
        string title, string? description,
        DateOnly startDate, DateOnly endDate, Guid medalId)
    {
        var sharedJourney = new SharedJourney(
            GuidGenerator.Create(), CurrentParentId, title, startDate, endDate, medalId);
        sharedJourney.SetDescription(description);
        return await _repository.InsertAsync(sharedJourney, autoSave: true);
    }

    /// <summary>取当前家长名下的共享计划；不属于则当作不存在。</summary>
    public async Task<SharedJourney> GetOwnedAsync(Guid id)
    {
        var sharedJourney = await _repository.FindAsync(id);
        if (sharedJourney == null || sharedJourney.ParentId != CurrentParentId)
        {
            throw new EntityNotFoundException(typeof(SharedJourney), id);
        }

        return sharedJourney;
    }

    /// <summary>当前家长名下所有共享计划（新→旧）。</summary>
    public async Task<List<SharedJourney>> GetOwnedListAsync()
    {
        var items = await _repository.GetListAsync(s => s.ParentId == CurrentParentId);
        return items.OrderByDescending(s => s.StartDate).ToList();
    }

    /// <summary>
    /// 编辑共享计划：改本体后，把反范式化的计划字段<b>同步到每份参与者旅程的副本</b>。
    /// 只碰副本字段（见 <see cref="Journey.SyncPlan"/>），不重算已开始孩子的冻结进化阈值。
    /// </summary>
    public async Task UpdatePlanAsync(SharedJourney sharedJourney, string title, string? description,
        DateOnly startDate, DateOnly endDate, Guid medalId)
    {
        sharedJourney.SetTitle(title);
        sharedJourney.SetDescription(description);
        sharedJourney.SetPeriod(startDate, endDate);
        sharedJourney.SetMedal(medalId);
        await _repository.UpdateAsync(sharedJourney, autoSave: true);

        var journeys = await _journeyRepository.GetListAsync(j => j.SharedJourneyId == sharedJourney.Id);
        foreach (var journey in journeys)
        {
            journey.SyncPlan(title, description, startDate, endDate, medalId);
            await _journeyRepository.UpdateAsync(journey);
        }
    }

    /// <summary>把若干孩子加入共享计划：各建一份 Draft 旅程（幂等，孩子稍后自己挑宠物再 Start）。</summary>
    public async Task AddParticipantsAsync(Guid sharedJourneyId, IEnumerable<Guid> childIds)
    {
        var sharedJourney = await GetOwnedAsync(sharedJourneyId);

        foreach (var childId in childIds.Distinct())
        {
            await _childManager.EnsureChildOwnedAsync(childId);

            var alreadyIn = await _journeyRepository.AnyAsync(
                j => j.SharedJourneyId == sharedJourney.Id && j.ChildId == childId);
            if (alreadyIn)
            {
                continue;
            }

            var journey = new Journey(GuidGenerator.Create(), sharedJourney.Id, sharedJourney.ParentId, childId,
                sharedJourney.Title, sharedJourney.StartDate, sharedJourney.EndDate, sharedJourney.MedalId);
            journey.SetDescription(sharedJourney.Description);
            await _journeyRepository.InsertAsync(journey);
        }
    }

    /// <summary>把某个孩子移出共享计划：Draft 直接删；已开始（Active/Completed）拒绝以护住进度。</summary>
    public async Task RemoveParticipantAsync(Guid sharedJourneyId, Guid childId)
    {
        var sharedJourney = await GetOwnedAsync(sharedJourneyId);

        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.SharedJourneyId == sharedJourney.Id && j.ChildId == childId);
        if (journey == null)
        {
            return; // 本就不在，幂等
        }

        if (journey.Status != JourneyStatus.Draft)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.SharedJourneyParticipantStarted);
        }

        await _journeyRepository.DeleteAsync(journey);
    }

    /// <summary>删共享计划：任一参与者已开始（Active/Completed）则拒绝；否则连带删所有 Draft 旅程 + 模板 + 本体。</summary>
    public async Task DeleteAsync(Guid sharedJourneyId)
    {
        var sharedJourney = await GetOwnedAsync(sharedJourneyId);

        var journeys = await _journeyRepository.GetListAsync(j => j.SharedJourneyId == sharedJourney.Id);
        if (journeys.Any(j => j.Status != JourneyStatus.Draft))
        {
            throw new BusinessException(HomeworkDomainErrorCodes.SharedJourneyHasStartedParticipant);
        }

        await _journeyRepository.DeleteManyAsync(journeys);
        await _templateRepository.DeleteAsync(t => t.SharedJourneyId == sharedJourney.Id);
        await _repository.DeleteAsync(sharedJourney);
    }
}
