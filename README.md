# THE BB 인플루언서 지원 사이트

이 프로젝트는 THE BB 성형외과의 인플루언서 지원을 위한 웹사이트입니다.

## 주요 기능

-   **메인 페이지**: 병원 소개 및 이벤트/가격 안내
-   **인플루언서 지원**: 양식을 통해 인플루언서 지원서 제출
-   **관리자 페이지**: 제출된 지원서 목록 확인 (비밀번호 보호)

## 기술 스택

-   **프론트엔드**: HTML, CSS, JavaScript, Tailwind CSS, Lucide Icons
-   **백엔드**: Node.js, Express
-   **데이터 저장소**: JSON 파일 (간단한 구현)

## 프로젝트 구조

```
/
├── admin/
│   ├── admin.html       # 관리자 페이지 (로그인, 지원자 목록)
│   └── admin.js         # 관리자 페이지 로직
├── assets/
│   ├── css/
│   │   └── style.css    # 추가 스타일시트
│   ├── images/          # 이미지 파일
│   └── js/
│       └── app.js       # 메인 페이지 로직
├── backend/
│   ├── server.js        # Express 백엔드 서버
│   └── applications.json # 지원자 데이터 저장 파일
├── node_modules/        # npm 패키지
├── index.html           # 메인 페이지
├── package.json
├── package-lock.json
└── README.md            # 프로젝트 안내 파일
```

## 실행 방법

### 1. 사전 준비

-   [Node.js](https://nodejs.org/)가 설치되어 있어야 합니다.

### 2. 백엔드 서버 실행

1.  프로젝트 루트 디렉토리(`TheBB_influencer`)에서 터미널을 엽니다.
2.  다음 명령어를 실행하여 필요한 패키지를 설치합니다.

    ```bash
    npm install
    ```

3.  다음 명령어를 실행하여 백엔드 서버를 시작합니다. 서버는 `http://localhost:3000`에서 실행됩니다.

    ```bash
    npm start
    ```

    서버가 정상적으로 실행되면 터미널에 "서버가 http://localhost:3000 에서 실행 중입니다."라는 메시지가 표시됩니다.

### 3. 프론트엔드 실행

1.  파일 탐색기에서 `index.html` 파일을 직접 더블클릭하거나, 웹 브라우저에서 파일 열기 기능을 사용하여 엽니다.
2.  또는, VS Code와 같은 에디터의 `Live Server`와 같은 확장 프로그램을 사용하여 실행할 수 있습니다.

### 4. 관리자 페이지 접속

1.  웹사이트에서 '관리자' 탭을 클릭하거나, 주소창에 `admin/admin.html`을 입력하여 접속합니다.
2.  초기 비밀번호는 `thebb_admin_password` 입니다. (`backend/server.js` 파일에서 수정 가능)

## 보안 참고사항

-   현재 구현된 관리자 인증은 매우 기본적인 방식입니다. 실제 운영 환경에서는 세션, JWT(JSON Web Token) 등 보안이 강화된 인증 방식을 사용해야 합니다.
-   데이터를 JSON 파일에 저장하는 방식은 간단한 데모용이며, 실제 서비스에서는 데이터베이스(예: MySQL, PostgreSQL, MongoDB 등)를 사용하는 것이 안전하고 효율적입니다.
-   서버 코드에 하드코딩된 비밀번호(`ADMIN_PASSWORD`)는 보안에 취약하므로, 실제 배포 시에는 반드시 환경 변수(`.env` 파일)를 사용하여 관리해야 합니다.
