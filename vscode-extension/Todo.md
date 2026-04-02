# VSCode/Cursor 확장 배포 TODO

목표: `vscode-extension/iyagi-lang`을 **VS Code Marketplace**와 **Open VSX(Cursor 포함)** 모두에서 설치 가능하게 배포하고, 사용자가 “저장 시 포맷(Format on Save)”까지 쉽게 켤 수 있도록 문서를 정리한다.

## 1) 확장 메타데이터 정리

- [ ] `vscode-extension/iyagi-lang/package.json`
  - [ ] `publisher`를 실제 배포용으로 변경(본인 계정/조직)
  - [ ] `repository`, `license`, `homepage`, `bugs` 추가
  - [ ] `keywords`, `categories` 정리
  - [ ] `icon` 추가(예: `icon.png`)
  - [ ] `displayName`/`description`/`version` 정책 정리
- [ ] `vscode-extension/iyagi-lang/README.md`(확장 전용) 추가/정리
  - [ ] 기능: syntax highlight + formatter + `iyagi: Format Document`
  - [ ] 설정: `[iyagi].editor.defaultFormatter`, `editor.formatOnSave` 안내

## 2) 패키징/배포 도구 추가

- [ ] `@vscode/vsce` 추가(Marketplace)
- [ ] `ovsx` 추가(Open VSX)
- [ ] 배포 스크립트 추가(예시)
  - [ ] `package` → `.vsix` 생성
  - [ ] `publish:marketplace`
  - [ ] `publish:openvsx`
- [ ] `.vscodeignore` 또는 `files` 필드로 VSIX 포함 파일 최소화
- [ ] 포맷터를 `@iyagi/formatter` 같은 npm 패키지로 분리

## 3) 릴리즈 전략(둘 다 지원)

- [ ] GitHub Release에 `.vsix` 첨부(수동/자동 중 선택)
- [ ] (선택) GitHub Actions로 태그 푸시 시
  - [ ] VSIX 빌드
  - [ ] Marketplace/Open VSX 동시 publish
  - [ ] Release 생성 + VSIX 업로드

## 4) 루트 문서(프로젝트 README) 정리

- [ ] 루트 `README.md`에 “확장 설치/사용” 섹션 보강
  - [ ] VS Code Marketplace 설치 방법
  - [ ] Cursor/Open VSX 설치 방법
  - [ ] VSIX 수동 설치 방법
  - [ ] 저장 시 자동 포맷 설정(`.vscode/settings.json`) 안내
