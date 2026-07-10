using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Volo.Abp.Content;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class MedalAppService_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IMedalAppService _service;

    public MedalAppService_Tests()
    {
        _service = GetRequiredService<IMedalAppService>();
    }

    [Fact]
    public async Task Create_And_ActiveList_Filters()
    {
        await _service.CreateAsync(new CreateUpdateMedalDto { Name = "显示", IsActive = true, DisplayOrder = 0 });
        await _service.CreateAsync(new CreateUpdateMedalDto { Name = "隐藏", IsActive = false, DisplayOrder = 1 });

        var active = await _service.GetActiveListAsync();
        active.Items.ShouldContain(i => i.Name == "显示");
        active.Items.ShouldNotContain(i => i.Name == "隐藏");
    }

    [Fact]
    public async Task Upload_Image_Sets_Url()
    {
        var created = await _service.CreateAsync(new CreateUpdateMedalDto { Name = "勋章" });
        var file = new RemoteStreamContent(new MemoryStream(Encoding.UTF8.GetBytes("img")), "m.png", "image/png");
        var dto = await _service.UploadImageAsync(created.Id, file);
        dto.ImageUrl.ShouldBe($"/medals/{created.Id:N}.png");
    }
}
