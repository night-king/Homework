using Homework.Samples;
using Xunit;

namespace Homework.EntityFrameworkCore.Applications;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<HomeworkEntityFrameworkCoreTestModule>
{

}
