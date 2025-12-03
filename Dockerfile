# Etapa 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copiar csproj
COPY api/Donaciones.Api/Donaciones.Api.csproj api/Donaciones.Api/

# Restaurar dependencias
RUN dotnet restore api/Donaciones.Api/Donaciones.Api.csproj

# Copiar el resto del código
COPY api/Donaciones.Api/ api/Donaciones.Api/

# Publicar en modo Release
RUN dotnet publish api/Donaciones.Api/Donaciones.Api.csproj -c Release -o /app/publish

# Etapa 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Donaciones.Api.dll"]