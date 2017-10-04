using System.Configuration;
using System.IO;
using System.IO.Compression;

namespace CreatePackage
{
    class Program
    {
        static void Main(string[] args)
        {
            string zipPath = ConfigurationManager.AppSettings["ZipFile"];

            if (File.Exists(zipPath))
                File.Delete(zipPath);

            ZipFile.CreateFromDirectory(ConfigurationManager.AppSettings["ExtensionDir"], zipPath);
        }
    }
}