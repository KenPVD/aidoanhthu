/* =========================================================
   XGAME FIREBASE MESSENGER
   =========================================================

   TÍNH NĂNG
   ---------------------------------------------------------
   ✅ Firebase Firestore realtime
   ✅ Gửi tin nhắn người dùng
   ✅ Nhận tin nhắn Admin realtime
   ✅ Tin nhắn tự động sau thời gian không phản hồi
   ✅ 30 = 30 giây
   ✅ 120 = 2 phút
   ✅ 900 = 15 phút
   ✅ Không cần nhắn lần 2 mới hiện auto
   ✅ Nếu Admin trả lời -> hủy auto
   ✅ Nếu người dùng nhắn tiếp -> reset bộ đếm
   ✅ Không spam auto liên tục
   ✅ Chỉ tải 100 tin gần nhất
   ✅ Không render lại toàn bộ chat mỗi lần Firebase thay đổi
   ✅ Enter để gửi
   ✅ Chống double-click gửi
   ✅ Tự scroll xuống cuối
   ✅ Responsive với giao diện hiện tại
   ✅ Không cần Telegram Bot
   ========================================================= */


/* =========================================================
   FIREBASE
   ========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limitToLast,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyDcOZNhCEnL2izlTpe4Nxy4Jwtf7YNx89k",

    authDomain:
        "xgame-7ff37.firebaseapp.com",

    projectId:
        "xgame-7ff37",

    storageBucket:
        "xgame-7ff37.firebasestorage.app",

    messagingSenderId:
        "204757980002",

    appId:
        "1:204757980002:web:acdccd4c02be7be378923b",

    measurementId:
        "G-7T0F0T1LME"
};


/* =========================================================
   KHỞI TẠO FIREBASE
   ========================================================= */

const firebaseApp =
    initializeApp(firebaseConfig);


const db =
    getFirestore(firebaseApp);


/* =========================================================
   CẤU HÌNH CHAT
   ========================================================= */


/*
    CHỈ CẦN SỬA SỐ NÀY
    --------------------------------

    30    = 30 giây
    60    = 1 phút
    120   = 2 phút
    300   = 5 phút
    600   = 10 phút
    900   = 15 phút
    1800  = 30 phút
*/

const AUTO_MESSAGE_SECONDS = 900;


/*
    Đổi sang milliseconds
*/

const AUTO_MESSAGE_DELAY =
    AUTO_MESSAGE_SECONDS * 1000;


/*
    Nội dung tin nhắn tự động
*/

const AUTO_MESSAGE_TEXT =
    "Đây là tin nhắn tự động! Mọi người cứ gửi lỗi hoặc vấn đề cần hỗ trợ, Đại sẽ xem và phản hồi trong vài phút.";


/*
    Số tin tối đa tải từ Firebase
*/

const MAX_MESSAGES = 100;


/* =========================================================
   CHẠY KHI HTML ĐÃ LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* =================================================
           LẤY CÁC ELEMENT TRONG HTML
           ================================================= */

        const chat =
            document.querySelector(
                ".side-chat"
            );


        const messages =
            document.querySelector(
                ".side-chat-messages"
            );


        const input =
            document.querySelector(
                ".side-chat-input input"
            );


        const closeButton =
            document.querySelector(
                ".side-chat-close"
            );


        const sendButton =
            document.querySelector(
                ".side-chat-send"
            );


        /* =================================================
           KIỂM TRA HTML
           ================================================= */

        if (!chat) {

            console.error(
                "❌ Không tìm thấy .side-chat"
            );

            return;
        }


        if (!messages) {

            console.error(
                "❌ Không tìm thấy .side-chat-messages"
            );

            return;
        }


        if (!input) {

            console.error(
                "❌ Không tìm thấy ô nhập tin nhắn"
            );

            return;
        }


        /* =================================================
           USER ID
           =================================================

           Mỗi trình duyệt sẽ có một ID riêng.

        ================================================= */

        let userId =
            localStorage.getItem(
                "xgame_chat_user_id"
            );


        if (!userId) {

            userId =
                "user_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .substring(2, 10);


            localStorage.setItem(
                "xgame_chat_user_id",
                userId
            );
        }


        console.log(
            "👤 XGAME User ID:",
            userId
        );


        /* =================================================
           STATE
           ================================================= */


        /*
            Đang gửi tin hay không
        */

        let isSending = false;


        /*
            Firebase đã load xong chưa
        */

        let firebaseReady = false;


        /*
            Timer auto
        */

        let autoTimer = null;


        /*
            Tin user cuối cùng
        */

        let lastUserMessageTime = 0;


        /*
            ID tin user cuối cùng
        */

        let lastUserMessageId = null;


        /*
            Auto đã gửi cho tin user cuối cùng chưa
        */

        let autoSentForLastUser = false;


        /*
            Admin đã trả lời sau tin user cuối chưa
        */

        let adminReplied = false;


        /*
            Lưu DOM message để không render lại toàn bộ
        */

        const renderedMessages =
            new Map();


        /* =================================================
           OPEN BUTTON
           =================================================

           Khi đóng chat, tạo nút mở lại.

        ================================================= */

        const openButton =
            document.createElement(
                "button"
            );


        openButton.type =
            "button";


        openButton.id =
            "xgameChatOpenButton";


        openButton.innerHTML =
            "💬";


        Object.assign(
            openButton.style,
            {

                position: "fixed",

                left: "20px",

                top: "50%",

                transform:
                    "translateY(-50%)",

                width: "58px",

                height: "58px",

                border: "none",

                borderRadius: "50%",

                cursor: "pointer",

                background:
                    "#0084ff",

                color:
                    "#fff",

                fontSize:
                    "25px",

                display:
                    "none",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                zIndex:
                    "999999",

                boxShadow:
                    "0 5px 20px rgba(0,0,0,.3)"
            }
        );


        document.body.appendChild(
            openButton
        );


        /* =================================================
           MỞ CHAT
           ================================================= */

        function openChat() {

            chat.style.display =
                "flex";


            openButton.style.display =
                "none";


            setTimeout(
                scrollToBottom,
                50
            );


            input.focus();
        }


        /* =================================================
           ĐÓNG CHAT
           ================================================= */

        function closeChat() {

            chat.style.display =
                "none";


            openButton.style.display =
                "flex";
        }


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeChat
            );
        }


        openButton.addEventListener(
            "click",
            openChat
        );


        /* =================================================
           SCROLL
           ================================================= */

        function isNearBottom() {

            const distance =
                messages.scrollHeight -
                messages.scrollTop -
                messages.clientHeight;


            return distance < 150;
        }


        function scrollToBottom() {

            messages.scrollTop =
                messages.scrollHeight;
        }


        /* =================================================
           TẠO MESSAGE DOM
           ================================================= */

        function createMessageElement(
            id,
            text,
            type
        ) {

            const message =
                document.createElement(
                    "div"
                );


            /*
                User:
                màu xanh / bên phải

                Admin + Auto:
                màu xám / bên trái
            */

            if (type === "user") {

                message.className =
                    "message sent";

            } else {

                message.className =
                    "message received";
            }


            message.textContent =
                text || "";


            message.dataset.messageId =
                id;


            return message;
        }


        /* =================================================
           THÊM MESSAGE
           ================================================= */

        function renderMessage(
            id,
            text,
            type,
            shouldScroll = false
        ) {

            /*
                Không render trùng
            */

            if (
                renderedMessages.has(id)
            ) {

                return;
            }


            const element =
                createMessageElement(
                    id,
                    text,
                    type
                );


            renderedMessages.set(
                id,
                element
            );


            messages.appendChild(
                element
            );


            if (shouldScroll) {

                requestAnimationFrame(
                    scrollToBottom
                );
            }
        }


        /* =================================================
           SỬA MESSAGE
           ================================================= */

        function updateMessage(
            id,
            text,
            type
        ) {

            const element =
                renderedMessages.get(
                    id
                );


            if (!element) {
                return;
            }


            element.textContent =
                text || "";


            element.className =
                type === "user"
                    ? "message sent"
                    : "message received";
        }


        /* =================================================
           XÓA MESSAGE
           ================================================= */

        function removeMessage(id) {

            const element =
                renderedMessages.get(
                    id
                );


            if (!element) {
                return;
            }


            element.remove();


            renderedMessages.delete(
                id
            );
        }


        /* =================================================
           HỦY AUTO TIMER
           ================================================= */

        function cancelAutoTimer() {

            if (autoTimer !== null) {

                clearTimeout(
                    autoTimer
                );

                autoTimer = null;
            }
        }


        /* =================================================
           GỬI AUTO MESSAGE
           ================================================= */

        async function sendAutoMessage() {

            /*
                Không gửi nếu:

                - chưa có user message
                - admin đã trả lời
                - auto đã gửi
            */

            if (
                !lastUserMessageId ||
                adminReplied ||
                autoSentForLastUser
            ) {

                return;
            }


            /*
                Kiểm tra lại thời gian
            */

            const elapsed =
                Date.now() -
                lastUserMessageTime;


            /*
                Chưa đủ thời gian
            */

            if (
                elapsed <
                AUTO_MESSAGE_DELAY
            ) {

                scheduleAutoMessage();
                return;
            }


            try {

                /*
                    Đánh dấu trước khi gửi
                    để tránh gửi trùng.
                */

                autoSentForLastUser =
                    true;


                await addDoc(

                    collection(
                        db,
                        "messages"
                    ),

                    {

                        text:
                            AUTO_MESSAGE_TEXT,

                        type:
                            "auto",

                        userId:
                            userId,

                        time:
                            Date.now(),

                        replyTo:
                            lastUserMessageId
                    }
                );


                console.log(
                    "💬 Auto message đã gửi"
                );


            } catch (error) {

                /*
                    Nếu Firebase lỗi
                    cho phép thử lại.
                */

                autoSentForLastUser =
                    false;


                console.error(
                    "❌ Không thể gửi auto message:",
                    error
                );
            }


            autoTimer =
                null;
        }


        /* =================================================
           ĐẶT LỊCH AUTO
           ================================================= */

        function scheduleAutoMessage() {

            /*
                Hủy timer cũ
            */

            cancelAutoTimer();


            /*
                Không được đặt nếu:

                - không có tin user
                - admin đã trả lời
                - auto đã gửi
            */

            if (
                !lastUserMessageId ||
                adminReplied ||
                autoSentForLastUser
            ) {

                return;
            }


            /*
                Tính thời gian còn lại

                Ví dụ:

                Delay = 30s
                Đã chờ = 5s

                Còn = 25s
            */

            const elapsed =
                Date.now() -
                lastUserMessageTime;


            const remaining =
                Math.max(
                    0,
                    AUTO_MESSAGE_DELAY -
                    elapsed
                );


            console.log(
                "⏱️ Auto còn:",
                Math.ceil(
                    remaining / 1000
                ),
                "giây"
            );


            autoTimer =
                setTimeout(
                    sendAutoMessage,
                    remaining
                );
        }


        /* =================================================
           FIRESTORE REALTIME
           ================================================= */

        const messagesQuery =
            query(

                collection(
                    db,
                    "messages"
                ),

                orderBy(
                    "time",
                    "asc"
                ),

                limitToLast(
                    MAX_MESSAGES
                )
            );


        onSnapshot(

            messagesQuery,

            (snapshot) => {

                /* =================================================
                   LẦN ĐẦU LOAD
                   ================================================= */

                if (!firebaseReady) {

                    messages.innerHTML =
                        "";


                    renderedMessages.clear();


                    /*
                        Tìm trạng thái cuộc hội thoại
                    */

                    let latestUser = null;

                    let latestAdmin = null;

                    let latestAuto = null;


                    const fragment =
                        document.createDocumentFragment();


                    snapshot.forEach(
                        (docSnapshot) => {

                            const data =
                                docSnapshot.data();


                            /*
                                Chỉ xử lý 3 loại
                            */

                            if (

                                data.type !== "user" &&
                                data.type !== "admin" &&
                                data.type !== "auto"

                            ) {

                                return;
                            }


                            const visualType =
                                data.type === "user"
                                    ? "user"
                                    : "received";


                            const element =
                                createMessageElement(
                                    docSnapshot.id,
                                    data.text || "",
                                    visualType
                                );


                            renderedMessages.set(
                                docSnapshot.id,
                                element
                            );


                            fragment.appendChild(
                                element
                            );


                            const time =
                                Number(
                                    data.time || 0
                                );


                            /*
                                Ghi nhận tin mới nhất
                            */

                            if (
                                data.type === "user"
                            ) {

                                if (
                                    !latestUser ||
                                    time >
                                    latestUser.time
                                ) {

                                    latestUser = {

                                        id:
                                            docSnapshot.id,

                                        time:
                                            time
                                    };
                                }
                            }


                            if (
                                data.type === "admin"
                            ) {

                                if (
                                    !latestAdmin ||
                                    time >
                                    latestAdmin.time
                                ) {

                                    latestAdmin = {

                                        id:
                                            docSnapshot.id,

                                        time:
                                            time
                                    };
                                }
                            }


                            if (
                                data.type === "auto"
                            ) {

                                if (
                                    !latestAuto ||
                                    time >
                                    latestAuto.time
                                ) {

                                    latestAuto = {

                                        id:
                                            docSnapshot.id,

                                        time:
                                            time
                                    };
                                }
                            }

                        }
                    );


                    messages.appendChild(
                        fragment
                    );


                    /*
                        Xác định trạng thái cuối
                    */

                    if (latestUser) {

                        lastUserMessageId =
                            latestUser.id;

                        lastUserMessageTime =
                            latestUser.time;


                        /*
                            Nếu có admin sau user
                            => đã được trả lời
                        */

                        adminReplied =
                            !!(
                                latestAdmin &&
                                latestAdmin.time >
                                latestUser.time
                            );


                        /*
                            Nếu có auto sau user
                            => auto đã gửi
                        */

                        autoSentForLastUser =
                            !!(
                                latestAuto &&
                                latestAuto.time >
                                latestUser.time
                            );


                        /*
                            Nếu admin trả lời sau auto
                            thì vẫn coi là đã xử lý.
                        */

                        if (
                            latestAdmin &&
                            latestAdmin.time >
                            latestUser.time
                        ) {

                            adminReplied =
                                true;

                        }

                    }


                    firebaseReady =
                        true;


                    /*
                        Nếu user đã gửi nhưng
                        chưa admin trả lời và
                        chưa auto thì tiếp tục timer.
                    */

                    if (
                        lastUserMessageId &&
                        !adminReplied &&
                        !autoSentForLastUser
                    ) {

                        scheduleAutoMessage();
                    }


                    requestAnimationFrame(
                        scrollToBottom
                    );


                    console.log(
                        "🔥 XGAME Firebase Chat: READY"
                    );


                    return;
                }


                /* =================================================
                   FIREBASE CÓ THAY ĐỔI
                   ================================================= */

                const shouldScroll =
                    isNearBottom();


                snapshot.docChanges()
                    .forEach(
                        (change) => {

                            const docSnapshot =
                                change.doc;


                            const data =
                                docSnapshot.data();


                            /*
                                Bỏ qua loại không hợp lệ
                            */

                            if (

                                data.type !== "user" &&
                                data.type !== "admin" &&
                                data.type !== "auto"

                            ) {

                                return;
                            }


                            /* =====================================
                               THÊM
                            ===================================== */

                            if (
                                change.type === "added"
                            ) {

                                renderMessage(

                                    docSnapshot.id,

                                    data.text || "",

                                    data.type === "user"
                                        ? "user"
                                        : "received",

                                    false
                                );


                                /*
                                    USER VỪA GỬI
                                */

                                if (
                                    data.type === "user"
                                ) {

                                    /*
                                        Chỉ xử lý nếu là user
                                        hiện tại hoặc chat này.
                                    */

                                    lastUserMessageId =
                                        docSnapshot.id;


                                    lastUserMessageTime =
                                        Number(
                                            data.time ||
                                            Date.now()
                                        );


                                    adminReplied =
                                        false;


                                    autoSentForLastUser =
                                        false;


                                    /*
                                        QUAN TRỌNG:

                                        Mỗi lần user nhắn
                                        -> reset 30 giây.
                                    */

                                    scheduleAutoMessage();


                                    console.log(
                                        "👤 Tin user mới -> bắt đầu đếm",
                                        AUTO_MESSAGE_SECONDS,
                                        "giây"
                                    );
                                }


                                /*
                                    ADMIN VỪA TRẢ LỜI
                                */

                                if (
                                    data.type === "admin"
                                ) {

                                    const adminTime =
                                        Number(
                                            data.time ||
                                            Date.now()
                                        );


                                    /*
                                        Chỉ hủy auto nếu
                                        admin trả lời sau
                                        tin user cuối.
                                    */

                                    if (
                                        adminTime >=
                                        lastUserMessageTime
                                    ) {

                                        adminReplied =
                                            true;


                                        cancelAutoTimer();


                                        console.log(
                                            "👨‍💻 Admin đã trả lời -> hủy auto"
                                        );
                                    }
                                }


                                /*
                                    AUTO ĐÃ GỬI
                                */

                                if (
                                    data.type === "auto"
                                ) {

                                    const autoTime =
                                        Number(
                                            data.time ||
                                            Date.now()
                                        );


                                    if (
                                        autoTime >=
                                        lastUserMessageTime
                                    ) {

                                        autoSentForLastUser =
                                            true;


                                        cancelAutoTimer();


                                        console.log(
                                            "💬 Auto đã được ghi nhận"
                                        );
                                    }
                                }
                            }


                            /* =====================================
                               SỬA
                            ===================================== */

                            else if (
                                change.type === "modified"
                            ) {

                                updateMessage(

                                    docSnapshot.id,

                                    data.text || "",

                                    data.type === "user"
                                        ? "user"
                                        : "received"
                                );
                            }


                            /* =====================================
                               XÓA
                            ===================================== */

                            else if (
                                change.type === "removed"
                            ) {

                                removeMessage(
                                    docSnapshot.id
                                );
                            }

                        }
                    );


                /*
                    Chỉ scroll khi người dùng
                    đang gần cuối.
                */

                if (shouldScroll) {

                    requestAnimationFrame(
                        scrollToBottom
                    );
                }

            },

            (error) => {

                console.error(
                    "❌ Firebase Realtime Error:",
                    error
                );

            }
        );

        function showLimitNotice() {

            const oldNotice =
                document.getElementById("xgameLimitNotice");

            if (oldNotice) {
                oldNotice.remove();
            }

            const notice =
                document.createElement("div");

            notice.id =
                "xgameLimitNotice";

            notice.textContent =
                "⚠️ Tin nhắn đã đạt giới hạn tối đa 100 ký tự.";

            Object.assign(notice.style, {

                position: "fixed",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",

                zIndex: "999999",

                padding: "12px 18px",
                borderRadius: "12px",

                background: "#333",
                color: "#fff",

                fontSize: "14px",
                fontWeight: "600",

                textAlign: "center",

                boxShadow:
                    "0 6px 24px rgba(0,0,0,.35)",

                opacity: "0",

                transition: "opacity .2s ease",

                pointerEvents: "none"

            });

            document.body.appendChild(notice);

            requestAnimationFrame(() => {
                notice.style.opacity = "1";
            });

            setTimeout(() => {

                notice.style.opacity = "0";

                setTimeout(() => {
                    notice.remove();
                }, 200);

            }, 1800);
        }

        /* =========================================================
           GỬI TIN NHẮN
           ========================================================= */

        async function sendMessage() {

            /*
                Chống double click
            */

            if (isSending) {
                return;
            }


            /*
                Lấy text
            */

            const text = input.value.trim();

            if (!text) return;

            const realLength = text.replace(/\s/g, "").length;

            if (realLength > 100) {
                showLimitNotice();
                return;
            }

            // CODE GỬI TIN FIREBASE Ở ĐÂY


            /*
                Firebase chưa sẵn sàng
            */

            if (!firebaseReady) {

                console.warn(
                    "⏳ Firebase chưa sẵn sàng."
                );

                return;
            }


            isSending =
                true;


            input.disabled =
                true;


            try {

                /*
                    Gửi USER message.

                    Timer sẽ được xử lý
                    bởi onSnapshot khi Firebase
                    nhận tin.
                */

                await addDoc(
                    collection(db, "messages"),
                    {
                        text: text,
                        type: "user",
                        userId: userId,
                        time: Date.now()
                    }
                );

                // ================================
                // GỬI THÔNG BÁO TELEGRAM
                // ================================

                const botToken = "8997310089:AAFhG47ySHJlo0auHtlDybKWsQ3G6waCSs0";
                const chatId = "7402989200";

                const telegramMessage =
                    `🔔 TIN NHẮN MỚI
👤 Khách: ${userId}
💬 Nội dung:
${text}
🌐 Xgame AI`;

                fetch(
                    `https://api.telegram.org/bot${botToken}/sendMessage` +
                    `?chat_id=${chatId}` +
                    `&text=${encodeURIComponent(telegramMessage)}`,
                    {
                        mode: "no-cors"
                    }
                );


                /*
                    Xóa ô nhập
                */

                input.value =
                    "";


                /*
                    Scroll
                */

                requestAnimationFrame(
                    scrollToBottom
                );


            } catch (error) {

                console.error(
                    "❌ Firebase Send Error:",
                    error
                );


                /*
                    Không mất tin người dùng
                */

                alert(
                    "Không thể gửi tin nhắn. Vui lòng thử lại."
                );

            } finally {

                isSending =
                    false;


                input.disabled =
                    false;


                input.focus();
            }
        }


        /* =========================================================
           NÚT GỬI
           ========================================================= */

        if (sendButton) {

            sendButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    sendMessage();
                }
            );
        }


        /* =========================================================
           ENTER ĐỂ GỬI
           ========================================================= */

        input.addEventListener(
            "keydown",
            (event) => {

                /*
                    Enter gửi

                    Shift + Enter:
                    không gửi
                */

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();
                }
            }
        );


        /* =========================================================
           FOCUS INPUT
           ========================================================= */

        input.addEventListener(
            "focus",
            () => {

                setTimeout(
                    scrollToBottom,
                    100
                );
            }
        );


        /* =========================================================
           CLEANUP KHI RỜI TRANG
           ========================================================= */

        window.addEventListener(
            "beforeunload",
            () => {

                cancelAutoTimer();
            }
        );


        /* =========================================================
           DEBUG
           ========================================================= */

        console.log(
            "=========================================="
        );

        console.log(
            "🚀 XGAME FIREBASE MESSENGER"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "🔥 Firebase: ONLINE"
        );

        console.log(
            "💬 Realtime chat: ENABLED"
        );

        console.log(
            "⚡ Optimized rendering: ENABLED"
        );

        console.log(
            "🛡️ Duplicate protection: ENABLED"
        );

        console.log(
            "🤖 Auto message: ENABLED"
        );

        console.log(
            "⏱️ Auto delay:",
            AUTO_MESSAGE_SECONDS,
            "seconds"
        );

        console.log(
            "👤 User:",
            userId
        );

        console.log(
            "=========================================="
        );

    }
);
