# UI Design System

Khi xây dựng UI Indoor Spatial, đọc và tuân thủ `docs/DESIGN_SYSTEM.md`. Dùng `createAppTheme`/`appTheme` từ `src/theme/theme.ts`, các token CSS trong `src/styles/global.css` và component chung trong `src/components/ui/`. Theme mặc định là Aurora tối; dùng `ThemeProvider` và `ThemeToggleButton` để đổi sáng/tối, lưu tại `ui:theme`. Không thêm mã màu rải rác trong page/component, không dùng emoji, giữ nội dung tiếng Việt và hỗ trợ responsive dưới 900px. Popup AntD dùng portal mặc định, không tắt motion bằng selector toàn cục.
