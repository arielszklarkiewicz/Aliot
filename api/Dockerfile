# .NET 8 minimal API Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY api/Donaciones.Api/Donaciones.Api.csproj api/Donaciones.Api/
RUN dotnet restore api/Donaciones.Api/Donaciones.Api.csproj
COPY . .
RUN dotnet publish api/Donaciones.Api/Donaciones.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Donaciones.Api.dll"]
