using Xunit;

namespace Homework.EntityFrameworkCore;

[CollectionDefinition(HomeworkTestConsts.CollectionDefinitionName)]
public class HomeworkEntityFrameworkCoreCollection : ICollectionFixture<HomeworkEntityFrameworkCoreFixture>
{

}
