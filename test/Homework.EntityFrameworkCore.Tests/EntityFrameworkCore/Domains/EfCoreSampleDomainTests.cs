using Homework.Samples;
using Xunit;

namespace Homework.EntityFrameworkCore.Domains;

[Collection(HomeworkTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<HomeworkEntityFrameworkCoreTestModule>
{

}
