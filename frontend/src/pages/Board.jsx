import Header from "../components/layout/Header";
import { useAuth } from "../context/AuthContext";
import { useOutletContext } from "react-router-dom";

export default function Board(){
    const {openMenu} = useOutletContext();
    const {activeOrg} = useAuth();
    
    return(
        <>
            <Header title="Board" onOpenMenu={openMenu}/>
            <div className="p-4 lg:p-6">
                <p className="text-sm text-ink-soft">
                    Projects and issues for {activeOrg?.name || "your organization"} arrive in the next chunk.
                </p>
            </div>
        </>
    )
}