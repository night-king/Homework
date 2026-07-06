using System;
using System.Collections.Generic;

namespace Homework.Tasks.Dtos;

public class DailyBoardDto
{
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
    public List<DailyTaskDto> Tasks { get; set; } = new();
    public int TasksTotal { get; set; }
    public int TasksCompleted { get; set; }
    public int Stars { get; set; }
    public bool IsFull { get; set; }
    public bool IsRestDay { get; set; }
}
