//#if DEBUG
//args = new[]
//{
//	@"Wordling-6letter.csv"
//};
//#endif

if (args.Length < 1)
{
	Console.WriteLine("Usage: " + Environment.GetCommandLineArgs()[0] + " <file>");
	return;
}

var file = args[0];
if (!File.Exists(file))
{
	Console.WriteLine("File not found: " + file);
	return;
}

var input = await File.ReadAllLinesAsync(file);
if (input.Length < 1)
{
	Console.WriteLine("File is empty: " + file);
	return;
}

var output = input.Select(x => x.ToLowerInvariant().Trim()).OrderBy(o => Guid.NewGuid());
await File.WriteAllLinesAsync("out.txt", output);