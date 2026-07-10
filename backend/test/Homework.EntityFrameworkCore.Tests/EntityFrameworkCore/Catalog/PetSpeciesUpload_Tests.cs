using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Volo.Abp;
using Volo.Abp.Content;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class PetSpeciesUpload_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IPetSpeciesAppService _service;

    public PetSpeciesUpload_Tests()
    {
        _service = GetRequiredService<IPetSpeciesAppService>();
    }

    private static RemoteStreamContent File(string name, string ct)
        => new(new MemoryStream(Encoding.UTF8.GetBytes("x")), name, ct);

    private async Task<Guid> FullyBuiltSpeciesAsync(string code)
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = code });
        await _service.UploadCoverAsync(s.Id, File("cover.png", "image/png"));
        for (var lvl = 1; lvl <= 4; lvl++)
        {
            await _service.SetFormAsync(s.Id, new SetPetFormDto { Level = lvl, Name = $"阶{lvl}", GrowthToNext = lvl * 20, Scale = 1m });
            await _service.UploadFormSpriteAsync(s.Id, lvl, File($"f{lvl}.png", "image/png"));
            await _service.UploadFormEvolveVideoAsync(s.Id, lvl, File($"e{lvl}.mp4", "video/mp4"));
        }
        await _service.SetFormAsync(s.Id, new SetPetFormDto { Level = 5, Name = "满阶", GrowthToNext = null, Scale = 1.6m });
        await _service.UploadFormSpriteAsync(s.Id, 5, File("f5.png", "image/png"));
        return s.Id;
    }

    [Fact]
    public async Task Upload_Cover_Sets_Url()
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "dc" });
        var dto = await _service.UploadCoverAsync(s.Id, File("cover.png", "image/png"));
        dto.CoverUrl.ShouldBe($"/pets/{s.Id:N}/cover.png");
    }

    [Fact]
    public async Task Upload_Form_Sprite_And_Video_Set_Urls()
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "dv" });
        await _service.SetFormAsync(s.Id, new SetPetFormDto { Level = 1, Name = "蛋", GrowthToNext = 20, Scale = 0.5m });
        await _service.UploadFormSpriteAsync(s.Id, 1, File("f1.png", "image/png"));
        var dto = await _service.UploadFormEvolveVideoAsync(s.Id, 1, File("e1.mp4", "video/mp4"));

        var form1 = dto.Forms.Single(f => f.Level == 1);
        form1.SpriteUrl.ShouldBe($"/pets/{s.Id:N}/form-1.png");
        form1.EvolveVideoUrl.ShouldBe($"/pets/{s.Id:N}/evolve-1-2.mp4");
    }

    [Fact]
    public async Task Activate_Succeeds_When_Fully_Built()
    {
        var id = await FullyBuiltSpeciesAsync("full");
        var dto = await _service.ActivateAsync(id);
        dto.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task Activate_Fails_When_Incomplete()
    {
        var s = await _service.CreateAsync(new CreateUpdatePetSpeciesDto { Name = "火龙", Code = "inc" });
        await Should.ThrowAsync<BusinessException>(async () => await _service.ActivateAsync(s.Id));
    }
}
