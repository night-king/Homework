using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Journeys;

public class JourneyManager : DomainService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<PetSpecies, Guid> _petSpeciesRepository;

    public JourneyManager(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<PetSpecies, Guid> petSpeciesRepository)
    {
        _journeyRepository = journeyRepository;
        _petSpeciesRepository = petSpeciesRepository;
    }

    /// <summary>开始旅程：单旅程约束 + 从图鉴宠物快照 5 阶阈值 + Journey.Start。</summary>
    public async Task StartAsync(Journey journey, Guid petSpeciesId)
    {
        var hasOtherActive = await _journeyRepository.AnyAsync(
            j => j.ChildId == journey.ChildId && j.Status == JourneyStatus.Active && j.Id != journey.Id);
        if (hasOtherActive)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyAlreadyHasActive);
        }

        var q = await _petSpeciesRepository.WithDetailsAsync(x => x.Forms);
        var species = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == petSpeciesId))
            ?? throw new EntityNotFoundException(typeof(PetSpecies), petSpeciesId);

        var stages = species.Forms.OrderBy(f => f.Level).Select(f => (f.Level, f.GrowthToNext));
        journey.Start(petSpeciesId, stages);
    }
}
