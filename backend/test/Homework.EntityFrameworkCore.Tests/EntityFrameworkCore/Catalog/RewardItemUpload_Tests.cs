using System.IO;
using System.Text;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Shouldly;
using Volo.Abp.Content;
using Xunit;

namespace Homework.EntityFrameworkCore.Catalog;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class RewardItemUpload_Tests : HomeworkEntityFrameworkCoreTestBase
{
    private readonly IRewardItemAppService _service;

    public RewardItemUpload_Tests()
    {
        _service = GetRequiredService<IRewardItemAppService>();
    }

    [Fact]
    public async Task Upload_Sets_IconUrl_With_Png_Extension()
    {
        var created = await _service.CreateAsync(new CreateUpdateRewardItemDto { Name = "号角", GrowthValue = 12, RandomWeight = 1 });
        var bytes = Encoding.UTF8.GetBytes("fake-png");
        var file = new RemoteStreamContent(new MemoryStream(bytes), "horn.png", "image/png");

        var dto = await _service.UploadIconAsync(created.Id, file);

        dto.IconUrl.ShouldNotBeNull();
        dto.IconUrl!.ShouldEndWith($"rewards/{created.Id:N}.png");
    }
}
