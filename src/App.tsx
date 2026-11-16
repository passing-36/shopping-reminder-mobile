import {useState, useEffect} from 'react'
import './App.css'

type ShoppingItem = {
    id: string
    name: string
    purchased: boolean
    purchasedAt?: string
}
type PurchaseHistoryItem = {
    id: string
    name: string
    purchasedAt: string
}
type LastPurchaseAction = {
    itemId: string
    historyId: string
    itemName: string
}
type PurchasePrediction = {
    name: string
    averageIntervalDays: number
    lastPurchasedAt: string
    nextPurchaseAt: string
    daysUntilNext: number
}

function App() {
    const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => {
        // ブラウザに保存されているデータを取得
        const savedData = localStorage.getItem('shoppingItems')

        if (savedData !== null) {
            try {
                const parsed: unknown = JSON.parse(savedData)

                // 保存データの形式を確認
                if (
                    Array.isArray(parsed) &&
                    parsed.every((item) =>
                        item !== null &&
                        typeof item === 'object' &&
                        typeof item.id === 'string' &&
                        typeof item.name === 'string' &&
                        typeof item.purchased === 'boolean'
                    )
                ) {
                    return parsed as ShoppingItem[]
                }
            } catch (error) {
                console.error('保存データの読み込みに失敗しました', error)
            }

            // 読み込めないデータは消さずに残す
            return []
        }

        // 初回起動時のサンプルデータ
        return [
            {
                id: '1',
                name: 'シャンプー',
                purchased: false
            },
            {
                id: '2',
                name: '食パン',
                purchased: false
            }
        ]
    })

    const [newItem, setNewItem] = useState('')
    const [manualFrequentItems, setManualFrequentItems] = useState<string[]>(() => {
        const saved = localStorage.getItem('manualFrequentItems')

        if (saved) {
            try {
                const parsed: unknown = JSON.parse(saved)

                if (
                    Array.isArray(parsed) &&
                    parsed.every((item) => typeof item === 'string')
                ) {
                    return parsed as string[]
                }
            } catch (error) {
                console.error('よく買うものの読み込みに失敗しました', error)
            }
        }

        return []
    })
    // 現在表示している画面を管理する
    const [activeTab, setActiveTab] = useState<
        'home' | 'history' | 'prediction'
    >('home')
    // 購入履歴を管理する
    const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>(() => {
        const savedData = localStorage.getItem('purchaseHistory')

        if (savedData !== null) {
            try {
                const parsed: unknown = JSON.parse(savedData)

                if (
                    Array.isArray(parsed) &&
                    parsed.every(
                        (item) =>
                            item !== null &&
                            typeof item === 'object' &&
                            typeof item.id === 'string' &&
                            typeof item.name === 'string' &&
                            typeof item.purchasedAt === 'string'
                    )
                ) {
                    return parsed as PurchaseHistoryItem[]
                }
            } catch (error) {
                console.error('購入履歴の読み込みに失敗しました', error)
            }

            // 不正な保存データは上書きせず、復旧できるようにする
            return []
        }

        return []
    })
    // 最後に購入済みにした操作を記憶する
    const [lastPurchaseAction, setLastPurchaseAction] =
        useState<LastPurchaseAction | null>(null)
    // 購入履歴が変更されたら自動保存する
    useEffect(() => {
        localStorage.setItem(
            'purchaseHistory',
            JSON.stringify(purchaseHistory)
        )
    }, [purchaseHistory])
    useEffect(() => {
        localStorage.setItem(
            'manualFrequentItems',
            JSON.stringify(manualFrequentItems)
        )
    }, [manualFrequentItems])
    // 買い物リストが変更されたら保存する
    useEffect(() => {
        localStorage.setItem(
            'shoppingItems',
            JSON.stringify(shoppingItems)
        )
    }, [shoppingItems])

    const addItem = () => {
        const name = newItem.trim()

        if (name === '') return

        // 同じ名前の商品を探す
        const existingItem = shoppingItems.find(
            (item) => item.name === name
        )

        // すでに未購入の商品がある場合
        if (existingItem && !existingItem.purchased) {
            alert('すでに買い物リストにあります')
            return
        }

        // 購入済みの商品がある場合は未購入に戻す
        if (existingItem && existingItem.purchased) {
            setShoppingItems((currentItems) =>
                currentItems.map((item) =>
                    item.id === existingItem.id
                        ? {...item, purchased: false}
                        : item
                )
            )

            setNewItem('')
            return
        }

        // 新しい商品を作成
        const item: ShoppingItem = {
            id: crypto.randomUUID(),
            name: name,
            purchased: false
        }

        // 買い物リストに追加
        setShoppingItems((currentItems) => [...currentItems, item])

        // 入力欄を空にする
        setNewItem('')
    }

    // 買い物リストから商品を削除する
    const deleteItem = (id: string) => {
        setShoppingItems((currentItems) =>
            currentItems.filter((item) => item.id !== id)
        )
    }
    const [newFrequentItem, setNewFrequentItem] = useState('')

    const addManualFrequentItem = () => {
        const name = newFrequentItem.trim()

        if (!name) return

        setManualFrequentItems((currentItems) => {
            if (currentItems.includes(name)) {
                return currentItems
            }

            return [...currentItems, name]
        })

        setNewFrequentItem('')
    }

    const deleteManualFrequentItem = (name: string) => {
        setManualFrequentItems((currentItems) =>
            currentItems.filter((item) => item !== name)
        )
    }
    const purchaseCounts = purchaseHistory.reduce<Record<string, number>>(
        (counts, item) => {
            const name = item.name.trim()

            if (name) {
                counts[name] = (counts[name] ?? 0) + 1
            }

            return counts
        },
        {}
    )

    const frequentItems = Object.entries(purchaseCounts)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
    // 購入状態を切り替え、購入履歴を記録する
    const togglePurchased = (id: string) => {
        const targetItem = shoppingItems.find(
            (item) => item.id === id
        )

        if (!targetItem) return

        // 未購入から購入済みに変更するときだけ履歴を記録
        if (!targetItem.purchased) {
            const now = new Date()

            // 日本時間ではなく、端末の現地日付で比較する
            const today = now.toLocaleDateString('sv-SE')

            // 同じ商品を今日すでに購入したか確認
            const alreadyPurchasedToday = purchaseHistory.some((item) => {
                const purchaseDate = new Date(item.purchasedAt)
                    .toLocaleDateString('sv-SE')

                return (
                    item.name === targetItem.name &&
                    purchaseDate === today
                )
            })

            if (!alreadyPurchasedToday) {
                // 今日初めて購入した商品だけ履歴に追加
                const historyItem: PurchaseHistoryItem = {
                    id: crypto.randomUUID(),
                    name: targetItem.name,
                    purchasedAt: now.toISOString()
                }

                setPurchaseHistory((currentHistory) => [
                    ...currentHistory,
                    historyItem
                ])

                setLastPurchaseAction({
                    itemId: targetItem.id,
                    historyId: historyItem.id,
                    itemName: targetItem.name
                })
            } else {
                // 履歴を追加していない場合は取り消し情報をクリア
                setLastPurchaseAction(null)
            }
        }
        // 購入済みを手動で解除した場合は取り消し情報を消す
        if (targetItem.purchased && lastPurchaseAction?.itemId === id) {
            setLastPurchaseAction(null)
        }

        // 買い物リストの購入状態を切り替える
        setShoppingItems((currentItems) =>
            currentItems.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        purchased: !item.purchased,
                        purchasedAt: item.purchased
                            ? undefined
                            : new Date().toISOString()
                    }
                    : item
            )
        )
    }
    // 購入履歴を1件削除する
    const deleteHistoryItem = (id: string) => {
        const confirmed = window.confirm(
            'この購入履歴を削除しますか？\n削除した履歴は元に戻せません。'
        )

        if (!confirmed) return

        setPurchaseHistory((currentHistory) =>
            currentHistory.filter((item) => item.id !== id)
        )
    }
    // 直前の購入操作を取り消す
    const undoLastPurchase = () => {
        if (!lastPurchaseAction) return

        const {itemId, historyId} = lastPurchaseAction

        // 購入履歴が残っているか確認
        const historyExists = purchaseHistory.some(
            (item) => item.id === historyId
        )

        // 商品が購入済みか確認
        const targetItem = shoppingItems.find(
            (item) => item.id === itemId
        )

        if (!historyExists || !targetItem || !targetItem.purchased) {
            setLastPurchaseAction(null)
            alert('この購入操作は取り消せません')
            return
        }

        // 今回の購入履歴だけ削除
        setPurchaseHistory((currentHistory) =>
            currentHistory.filter((item) => item.id !== historyId)
        )

        // 商品を未購入に戻す
        setShoppingItems((currentItems) =>
            currentItems.map((item) =>
                item.id === itemId
                    ? {...item, purchased: false}
                    : item
            )
        )

        setLastPurchaseAction(null)
    }
    // よく買うものをワンタップで追加する
    const addFrequentItem = (name: string) => {
        // 同じ商品がすでにあるか確認
        const existingItem = shoppingItems.find(
            (item) => item.name === name
        )

        if (existingItem) {
            // 購入済みなら未購入に戻す
            if (existingItem.purchased) {
                setShoppingItems((currentItems) =>
                    currentItems.map((item) =>
                        item.id === existingItem.id
                            ? {...item, purchased: false}
                            : item
                    )
                )
            } else {
                alert('すでに買い物リストにあります')
            }
            return
        }

        // 商品がなければ新しく追加
        const item: ShoppingItem = {
            id: crypto.randomUUID(),
            name: name,
            purchased: false
        }

        setShoppingItems((currentItems) => [...currentItems, item])
    }
    // 買い物リストをJSONファイルに保存
    const exportShoppingData = () => {
        const data = {
            version: 2,
            exportedAt: new Date().toISOString(),
            shoppingItems: shoppingItems,
            purchaseHistory: purchaseHistory
        }

        const json = JSON.stringify(data, null, 2)

        const blob = new Blob([json], {
            type: 'application/json'
        })

        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = 'shopping-backup.json'

        document.body.appendChild(link)
        link.click()
        link.remove()

        setTimeout(() => {
            URL.revokeObjectURL(url)
        }, 1000)
    }
    // バックアップから買い物リストと購入履歴を復元
    const importShoppingData = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]

        if (!file) return

        try {
            const text = await file.text()
            const data: unknown = JSON.parse(text)

            // バックアップの基本形式を確認
            if (
                typeof data !== 'object' ||
                data === null ||
                !('version' in data) ||
                (data.version !== 1 && data.version !== 2) ||
                !('shoppingItems' in data) ||
                !Array.isArray(data.shoppingItems) ||
                !data.shoppingItems.every(
                    (item: unknown) =>
                        typeof item === 'object' &&
                        item !== null &&
                        'id' in item &&
                        typeof item.id === 'string' &&
                        'name' in item &&
                        typeof item.name === 'string' &&
                        'purchased' in item &&
                        typeof item.purchased === 'boolean'
                )
            ) {
                alert('対応していないバックアップファイルです')
                return
            }

            const restoredItems = data.shoppingItems as ShoppingItem[]

            // version 2 の場合は購入履歴も確認
            let restoredHistory: PurchaseHistoryItem[] | null = null

            if (data.version === 2) {
                if (
                    !('purchaseHistory' in data) ||
                    !Array.isArray(data.purchaseHistory) ||
                    !data.purchaseHistory.every(
                        (item: unknown) =>
                            typeof item === 'object' &&
                            item !== null &&
                            'id' in item &&
                            typeof item.id === 'string' &&
                            'name' in item &&
                            typeof item.name === 'string' &&
                            'purchasedAt' in item &&
                            typeof item.purchasedAt === 'string'
                    )
                ) {
                    alert('購入履歴のデータ形式が正しくありません')
                    return
                }

                restoredHistory = data.purchaseHistory as PurchaseHistoryItem[]
            }

            // 復元内容を確認
            const message =
                `買い物リスト：${restoredItems.length}件\n` +
                (restoredHistory !== null
                    ? `購入履歴：${restoredHistory.length}件\n`
                    : '購入履歴：現在のデータを維持\n') +
                '\n対象のデータが置き換えられます。\n' +
                '復元を実行しますか？'

            if (!window.confirm(message)) return

            // 確認後に復元
            setShoppingItems(restoredItems)

            if (restoredHistory !== null) {
                setPurchaseHistory(restoredHistory)
            }

            alert('バックアップを復元しました')

        } catch (error) {
            console.error('復元エラー:', error)
            alert('バックアップファイルを読み込めませんでした')
        } finally {
            event.target.value = ''
        }
    }
    // 未購入の商品
    const unpurchasedItems = shoppingItems.filter(
        (item) => !item.purchased
    )
    // 購入履歴を日付ごとに分類する
    const groupedHistory = [...purchaseHistory]
        .sort(
            (a, b) =>
                new Date(b.purchasedAt).getTime() -
                new Date(a.purchasedAt).getTime()
        )
        .reduce<Record<string, PurchaseHistoryItem[]>>(
            (groups, item) => {
                const date = new Date(item.purchasedAt)
                    .toLocaleDateString('sv-SE')

                if (!groups[date]) {
                    groups[date] = []
                }

                groups[date].push(item)
                return groups
            },
            {}
        )
    // 購入履歴から平均購入間隔を計算する
    const purchasePredictions: PurchasePrediction[] = []

    // 商品名ごとに購入日時をまとめる
    const historyByName: Record<string, number[]> = {}


    // テスト用の購入履歴から予測を計算
    purchaseHistory.forEach((item) => {
        const timestamp = new Date(item.purchasedAt).getTime()

        // 不正な日時は除外する
        if (!Number.isFinite(timestamp)) return

        if (!historyByName[item.name]) {
            historyByName[item.name] = []
        }

        historyByName[item.name].push(timestamp)
    })

    // 商品ごとに予測を計算する
    Object.entries(historyByName).forEach(([name, dates]) => {
        // 購入履歴が2件未満なら予測しない
        if (dates.length < 2) return

        // 同じ日に購入した履歴を1回にまとめる
        const uniqueDates = Array.from(
            new Set(
                dates.map((timestamp) => {
                    const date = new Date(timestamp)

                    return new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate()
                    ).getTime()
                })
            )
        )

        // 古い順に並べる
        uniqueDates.sort((a, b) => a - b)

        // 異なる購入日が2日以上なければ予測しない
        if (uniqueDates.length < 2) return

        // 購入間隔を計算する
        const intervals: number[] = []

        for (let i = 1; i < uniqueDates.length; i++) {
            const interval =
                (uniqueDates[i] - uniqueDates[i - 1]) / (1000 * 60 * 60 * 24)

            if (interval > 0) {
                intervals.push(interval)
            }
        }

        if (intervals.length === 0) return

        // 平均購入間隔を計算する
        const averageIntervalDays =
            intervals.reduce((sum, days) => sum + days, 0) /
            intervals.length

        // 最後の購入日
        const lastPurchased: number = uniqueDates[uniqueDates.length - 1]
        // 実際に最後に購入した日時を取得する
        const lastPurchasedTimestamp: number = Math.max(...dates)

        // 次回購入予測日
        const nextPurchase =
            lastPurchased + averageIntervalDays * 24 * 60 * 60 * 1000

        // 今日から何日後か
        const daysUntilNext = Math.ceil(
            (nextPurchase - Date.now()) / (1000 * 60 * 60 * 24)
        )

        purchasePredictions.push({
            name,
            averageIntervalDays,
            lastPurchasedAt: new Date(lastPurchasedTimestamp).toISOString(),
            nextPurchaseAt: new Date(nextPurchase).toISOString(),
            daysUntilNext
        })
    })

    // 購入予測日が近い順に並べる
    purchasePredictions.sort(
        (a, b) => a.daysUntilNext - b.daysUntilNext
    )
    // 購入時期が近く、未購入リストになく、
    // 購入から24時間以上経過した商品だけを表示
    const upcomingPredictions = purchasePredictions.filter(
        (prediction) => {
            const hoursSinceLastPurchase =
                (Date.now() - new Date(prediction.lastPurchasedAt).getTime()) /
                (1000 * 60 * 60)

            const isAlreadyInShoppingList = shoppingItems.some(
                (item) =>
                    item.name.trim() === prediction.name.trim() &&
                    !item.purchased
            )

            return (
                prediction.daysUntilNext <= 3 &&
                hoursSinceLastPurchase >= 24 &&
                !isAlreadyInShoppingList
            )
        }
    )
    return (
        <div className="app">
            {activeTab === 'home' && (
                <main className="content">

                    <section className="hero">
                        <p className="eyebrow">SHOPPING LIST</p>
                        <h1>お買い物メモ</h1>
                    </section>

                    <section className="shopping-section">
                        <div className="section-heading">
                            <h2>買い物リスト</h2>
                            <span>未購入 {unpurchasedItems.length}件</span>
                        </div>

                        <div className="add-form">
                            <input
                                className="shopping-input"
                                type="text"
                                placeholder="買うものを入力"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addItem()
                                }}
                            />
                            <button
                                className="add-button"
                                onClick={addItem}
                            >
                                ＋ 追加
                            </button>
                        </div>
                        {/* 直前の購入操作を取り消す */}
                        {lastPurchaseAction && activeTab === 'home' && (
                            <div className="purchase-undo">
    <span>
      {lastPurchaseAction.itemName}を購入済みにしました
    </span>

                                <button
                                    type="button"
                                    onClick={undoLastPurchase}
                                    className="purchase-undo-button"
                                >
                                    元に戻す
                                </button>
                            </div>
                        )}
                        <div className="shopping-list">
                            {shoppingItems
                                .filter((item) => {
                                    if (!item.purchased) return true

                                    if (!item.purchasedAt) return false

                                    const purchasedDate = new Date(item.purchasedAt)
                                    if (Number.isNaN(purchasedDate.getTime())) return false

                                    const today = new Date()

                                    return (
                                        purchasedDate.getFullYear() === today.getFullYear() &&
                                        purchasedDate.getMonth() === today.getMonth() &&
                                        purchasedDate.getDate() === today.getDate()
                                    )
                                })
                                .map((item) => (
                                    <div
                                        className={`shopping-card ${item.purchased ? 'purchased-card' : ''}`}
                                        key={item.id}
                                    >
                                        <button
                                            type="button"
                                            className="check-circle"
                                            onClick={() => togglePurchased(item.id)}
                                            aria-label={`${item.name}を${item.purchased ? '未購入' : '購入済み'}にする`}
                                            aria-pressed={item.purchased}
                                        >
                                            {item.purchased ? '✓' : '○'}
                                        </button>

                                        <span className="item-name">
                  {item.name}
                </span>

                                        <button
                                            className="delete-button"
                                            onClick={() => deleteItem(item.id)}
                                        >
                                            削除
                                        </button>
                                    </div>
                                ))}
                        </div>

                    </section>

                    <section className="prediction-card">
                        <h2>そろそろ必要かも？</h2>
                        <p>購入履歴から次のお買いものを予測</p>
                        {upcomingPredictions.length === 0 ? (
                            <p className="prediction-message">
                                今のところ購入時期が近い商品はありません。
                            </p>
                        ) : (
                            <div className="prediction-list">
                                {upcomingPredictions.map((prediction) => (
                                    <div className="prediction-item" key={prediction.name}>
                                        <div className="prediction-item-info">
                                            <strong>{prediction.name}</strong>
                                            <small>
                                                平均 {Math.round(prediction.averageIntervalDays)}日ごとに購入
                                            </small>
                                        </div>

                                        <span className="prediction-days">
          {prediction.daysUntilNext <= 0
              ? '購入目安'
              : `あと${prediction.daysUntilNext}日`}
        </span>
                                        <button
                                            type="button"
                                            className="prediction-add-button"
                                            onClick={() => addFrequentItem(prediction.name)}
                                        >
                                            ＋追加
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="frequent-card">
                        <h2>よく買うもの</h2>
                        <p>いつもの商品をワンタップで追加</p>

                        <div className="frequent-grid">
                            {frequentItems.map((item) => (
                                <button
                                    type="button"
                                    className="frequent-button"
                                    key={item}
                                    onClick={() => addFrequentItem(item)}
                                >
                                    ＋ {item}
                                </button>
                            ))}
                        </div>

                        <h3>自分で登録した商品</h3>

                        <div className="frequent-grid">
                            {manualFrequentItems.map((item) => (
                                <div className="manual-frequent-item" key={item}>
                                    <button
                                        type="button"
                                        className="frequent-button"
                                        onClick={() => addFrequentItem(item)}
                                    >
                                        ＋ {item}
                                    </button>

                                    <button
                                        type="button"
                                        className="manual-delete-button"
                                        onClick={() => deleteManualFrequentItem(item)}
                                        aria-label={`${item}を登録解除`}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="manual-frequent-form">
                            <input
                                type="text"
                                placeholder="よく買う商品を入力"
                                value={newFrequentItem}
                                onChange={(e) => setNewFrequentItem(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addManualFrequentItem()
                                }}
                            />

                            <button
                                type="button"
                                onClick={addManualFrequentItem}
                            >
                                ＋ 登録
                            </button>
                        </div>
                    </section>
                </main>
            )}
            {activeTab === 'history' && (
                <main className="content">
                    <section className="history-section">
                        <header className="history-header">
                            <p className="eyebrow">PURCHASE HISTORY</p>
                            <h1>購入履歴</h1>
                            <p className="history-subtitle">
                                これまでのお買い物を振り返る
                            </p>
                        </header>
                        {/* 購入履歴のサマリーカード */}
                        <div className="history-summary">
                            <p className="history-summary-label">
                                TOTAL PURCHASES
                            </p>

                            <div className="history-summary-count">
                                <strong>{purchaseHistory.length}</strong>
                                <span>件</span>
                            </div>

                            <p className="history-summary-description">
                                記録された購入履歴
                            </p>
                        </div>

                        {purchaseHistory.length === 0 ? (
                            <p>まだ購入履歴はありません。</p>
                        ) : (
                            <div className="history-list">
                                {Object.entries(groupedHistory).map(([date, items]) => (
                                    <div className="history-day" key={date}>
                                        <div className="history-date-heading">
                                            <h2>
                                                {new Date(`${date}T00:00:00`).toLocaleDateString(
                                                    'ja-JP',
                                                    {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        weekday: 'short'
                                                    }
                                                )}
                                            </h2>
                                            <span>{items.length}件</span>
                                        </div>

                                        {items.map((item) => (
                                            <div className="history-item" key={item.id}>
                                                <span className="history-check">✓</span>

                                                <div className="history-item-info">
                                                    <strong>{item.name}</strong>
                                                    <small>
                                                        {new Date(item.purchasedAt).toLocaleTimeString(
                                                            'ja-JP',
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }
                                                        )}
                                                    </small>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="history-delete-button"
                                                    onClick={() => deleteHistoryItem(item.id)}
                                                    aria-label={`${item.name}の購入履歴を削除`}
                                                >
                                                    削除
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            )}
            {/* 購入予測画面 */}
            {activeTab === 'prediction' && (
                <main className="content">
                    <section className="prediction-section">
                        <header className="prediction-header">
                            <p className="eyebrow">SHOPPING PREDICTION</p>
                            <h1>購入予測</h1>
                            <p className="prediction-subtitle">
                                いつものお買いものを、もっと便利に。
                            </p>
                        </header>

                        <div className="prediction-summary">
                            <p>SHOPPING PREDICTION</p>
                            <h2>次のお買いものを予測</h2>
                            <p>
                                過去の購入履歴から、次に必要になりそうな商品をお知らせします。
                            </p>
                        </div>
                        {/* 購入予測の商品一覧 */}
                        <div className="prediction-list">
                            <h2>購入周期が分かっている商品</h2>

                            {purchasePredictions.length === 0 ? (
                                <p className="prediction-empty">
                                    まだ購入予測できる商品はありません。
                                    異なる日に2回以上購入すると、
                                    予測できるようになります。
                                </p>
                            ) : (
                                purchasePredictions.map((prediction) => (
                                    <div
                                        className="prediction-item"
                                        key={prediction.name}
                                    >
                                        <div className="prediction-item-info">
                                            <h3>{prediction.name}</h3>

                                            <p>
                                                平均約
                                                {Math.round(prediction.averageIntervalDays)}
                                                日ごとに購入
                                            </p>

                                            <p>
                                                次回購入予測：
                                                {new Date(
                                                    prediction.nextPurchaseAt
                                                ).toLocaleDateString('ja-JP')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="prediction-add-button"
                                            onClick={() => addFrequentItem(prediction.name)}
                                        >
                                            ＋ 追加
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </main>
            )}
            <div className="backup-area">
                <button
                    type="button"
                    className="backup-button"
                    onClick={exportShoppingData}
                >
                    データをバックアップ
                </button>

                <label className="restore-button">
                    バックアップから復元
                    <input
                        type="file"
                        accept=".json,application/json"
                        onChange={importShoppingData}
                        style={{display: 'none'}}
                    />
                </label>
            </div>

            <nav className="bottom-nav">
                <button
                    type="button"
                    className={activeTab === 'home' ? 'active' : ''}
                    onClick={() => setActiveTab('home')}
                    aria-current={activeTab === 'home' ? 'page' : undefined}
                >
                    <span className="nav-icon" aria-hidden="true">⌂</span>
                    <span>ホーム</span>
                </button>

                <button
                    type="button"
                    className={activeTab === 'history' ? 'active' : ''}
                    onClick={() => setActiveTab('history')}
                    aria-current={activeTab === 'history' ? 'page' : undefined}
                >
                    <span className="nav-icon" aria-hidden="true">◷</span>
                    <span>購入履歴</span>
                </button>

                <button
                    type="button"
                    className={activeTab === 'prediction' ? 'active' : ''}
                    onClick={() => setActiveTab('prediction')}
                    aria-current={activeTab === 'prediction' ? 'page' : undefined}
                >
                    <span className="nav-icon" aria-hidden="true">▥</span>
                    <span>購入予測</span>
                </button>
            </nav>
        </div>
    )
}

export default App