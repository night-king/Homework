using System;

namespace Homework.Tasks.Dtos;

public class GetDailyBoardInput
{
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
}
